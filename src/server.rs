use anyhow::Result;
use axum::{
    extract::State,
    http::StatusCode,
    response::{Html, IntoResponse, Response},
    routing::{delete, get},
    Router,
};
use socketioxide::{extract::SocketRef, SocketIo};

use include_dir::{include_dir, Dir};
use path_absolutize::*;
use std::{net::SocketAddr, path::PathBuf, sync::Arc};
use tokio::{fs, sync::RwLock};
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info, warn};

use crate::{file_watcher::FileWatcher, markdown::MarkdownProcessor};

// Embed the built client files from the parent project
static CLIENT_DIST: Dir<'_> = include_dir!("../public/dist");

#[derive(Clone)]
pub struct AppState {
    pub markdown_processor: Arc<MarkdownProcessor>,
    pub current_file: Arc<RwLock<Option<PathBuf>>>,
    pub file_watcher: Arc<RwLock<Option<FileWatcher>>>,
    pub socketio: Arc<RwLock<Option<SocketIo>>>,
}

pub struct LivedownServer {
    port: u16,
    state: AppState,
}

impl LivedownServer {
    pub fn new(port: u16) -> Result<Self> {
        let state = AppState {
            markdown_processor: Arc::new(MarkdownProcessor::new()),
            current_file: Arc::new(RwLock::new(None)),
            file_watcher: Arc::new(RwLock::new(None)),
            socketio: Arc::new(RwLock::new(None)),
        };

        Ok(Self { port, state })
    }

    pub async fn start(
        self,
        file_path: PathBuf,
        open_browser: bool,
        browser_cmd: Option<String>,
    ) -> Result<()> {
        let file_path = file_path.absolutize()?.to_path_buf();

        // Store the current file
        {
            let mut current_file = self.state.current_file.write().await;
            *current_file = Some(file_path.clone());
        }

        // Create Socket.IO instance
        let (layer, io) = SocketIo::new_layer();

        // Store Socket.IO instance in state
        {
            let mut socketio_guard = self.state.socketio.write().await;
            *socketio_guard = Some(io.clone());
        }

        // Setup Socket.IO event handlers
        let state_clone = self.state.clone();
        io.ns("/", move |socket: SocketRef| {
            let state = state_clone.clone();
            async move {
                info!("Socket.IO client connected: {}", socket.id);

                // Send initial content when client connects
                let current_file_guard = state.current_file.read().await;
                if let Some(ref file_path) = *current_file_guard {
                    // Send title
                    let title = file_path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("Untitled");

                    if let Err(e) = socket.emit("title", title) {
                        error!("Failed to emit title: {}", e);
                        return;
                    }

                    // Send initial content
                    match fs::read_to_string(file_path).await {
                        Ok(content) => {
                            let rendered = state.markdown_processor.render(&content);
                            if let Err(e) = socket.emit("content", rendered) {
                                error!("Failed to emit initial content: {}", e);
                            }
                        }
                        Err(e) => {
                            error!("Failed to read file: {}", e);
                        }
                    }
                }

                socket.on_disconnect(|socket: SocketRef| async move {
                    info!("Socket.IO client disconnected: {}", socket.id);
                });
            }
        });

        // Create file watcher
        let (mut watcher, mut file_rx) = FileWatcher::new()?;
        watcher.watch_file(&file_path)?;

        {
            let mut file_watcher_guard = self.state.file_watcher.write().await;
            *file_watcher_guard = Some(watcher);
        }

        // Spawn file watcher task
        let io_clone = io.clone();
        let markdown_processor = self.state.markdown_processor.clone();
        let current_file_clone = self.state.current_file.clone();

        tokio::spawn(async move {
            while let Ok(changed_file) = file_rx.recv().await {
                info!("File changed: {}", changed_file);

                let current_file_guard = current_file_clone.read().await;
                if let Some(ref current_file) = *current_file_guard {
                    if current_file.to_string_lossy() == changed_file {
                        match fs::read_to_string(current_file).await {
                            Ok(content) => {
                                let rendered = markdown_processor.render(&content);
                                if let Err(e) = io_clone.emit("content", rendered) {
                                    error!("Failed to emit content update: {}", e);
                                }
                            }
                            Err(e) => {
                                error!("Failed to read file {}: {}", current_file.display(), e);
                            }
                        }
                    }
                }
            }
        });

        // Build the app
        let app = Router::new()
            .route("/", get(serve_index))
            .route("/", delete(shutdown_handler))
            .fallback(serve_static)
            .layer(layer)
            .layer(
                ServiceBuilder::new().layer(CorsLayer::new().allow_origin(Any).allow_methods(Any)),
            )
            .with_state(self.state.clone());

        // Start the server
        let addr = SocketAddr::from(([127, 0, 0, 1], self.port));
        info!("Starting server on http://localhost:{}", self.port);

        // Open browser if requested
        if open_browser {
            let url = format!("http://localhost:{}", self.port);
            tokio::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                if let Some(browser_cmd) = browser_cmd {
                    if let Err(e) = open::with(&url, &browser_cmd) {
                        warn!(
                            "Failed to open browser with command '{}': {}",
                            browser_cmd, e
                        );
                        println!("Please visit {}", url);
                    }
                } else if let Err(e) = open::that(&url) {
                    warn!("Failed to open browser: {}", e);
                    println!("Please visit {}", url);
                }
            });
        } else {
            println!(
                "Markdown preview available at http://localhost:{}",
                self.port
            );
        }

        let listener = tokio::net::TcpListener::bind(addr).await?;
        axum::serve(listener, app).await?;

        Ok(())
    }
}

async fn serve_index(State(_state): State<AppState>) -> Result<Html<String>, StatusCode> {
    // Serve the embedded index.html from the built client
    if let Some(file) = CLIENT_DIST.get_file("index.html") {
        let content = file.contents_utf8().unwrap_or_default();
        Ok(Html(content.to_string()))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn serve_static(uri: axum::http::Uri) -> Response {
    let path = uri.path().trim_start_matches('/');

    // Try to serve from embedded client files
    if let Some(file) = CLIENT_DIST.get_file(path) {
        let mime_type = mime_guess::from_path(path).first_or_octet_stream();

        return (
            StatusCode::OK,
            [("content-type", mime_type.as_ref())],
            file.contents(),
        )
            .into_response();
    }

    // If not found, return 404
    StatusCode::NOT_FOUND.into_response()
}

async fn shutdown_handler(State(state): State<AppState>) -> impl IntoResponse {
    info!("Shutdown requested");

    // Send kill event to all connected Socket.IO clients
    if let Some(ref io) = *state.socketio.read().await {
        if let Err(e) = io.emit("kill", ()) {
            error!("Failed to emit kill event: {}", e);
        }
    }

    tokio::spawn(async {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        std::process::exit(0);
    });

    StatusCode::OK
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_server_creation() {
        let server = LivedownServer::new(8080).unwrap();
        assert_eq!(server.port, 8080);
    }

    #[tokio::test]
    async fn test_markdown_processing() {
        let processor = MarkdownProcessor::new();
        let result = processor.render("# Test\nHello **world**!");
        assert!(result.contains("<h1"));
        assert!(result.contains("<strong>world</strong>"));
    }
}
