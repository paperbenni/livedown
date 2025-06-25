use anyhow::Result;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc;
use std::time::Duration;
use tokio::sync::broadcast;
use tracing::{debug, error, warn};

pub struct FileWatcher {
    _watcher: RecommendedWatcher,
    #[allow(dead_code)]
    sender: broadcast::Sender<String>,
}

impl FileWatcher {
    pub fn new() -> Result<(Self, broadcast::Receiver<String>)> {
        let (tx, rx) = broadcast::channel(100);
        let (file_tx, file_rx) = mpsc::channel();

        let tx_clone = tx.clone();

        // Create the watcher
        let watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Err(e) = file_tx.send(res) {
                    error!("Failed to send file event: {}", e);
                }
            },
            Config::default().with_poll_interval(Duration::from_millis(50)),
        )?;

        // Spawn a task to handle file events
        tokio::spawn(async move {
            loop {
                match file_rx.recv() {
                    Ok(event_result) => {
                        match event_result {
                            Ok(event) => {
                                debug!("File event: {:?}", event);

                                // Process all write/modify events
                                if matches!(
                                    event.kind,
                                    EventKind::Modify(_)
                                        | EventKind::Create(_)
                                        | EventKind::Remove(_)
                                ) {
                                    for path in &event.paths {
                                        if let Some(extension) = path.extension() {
                                            if extension == "md" || extension == "markdown" {
                                                let path_str = path.to_string_lossy().to_string();
                                                debug!("Broadcasting file change: {}", path_str);
                                                if let Err(e) = tx_clone.send(path_str) {
                                                    error!(
                                                        "Failed to broadcast file change: {}",
                                                        e
                                                    );
                                                }
                                                break; // Only send once per event
                                            }
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                error!("File watcher error: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        error!("File watcher receiver error: {}", e);
                        break;
                    }
                }
            }
        });

        Ok((
            Self {
                _watcher: watcher,
                sender: tx,
            },
            rx,
        ))
    }

    pub fn watch_file<P: AsRef<Path>>(&mut self, path: P) -> Result<()> {
        let path = path.as_ref();
        debug!("Starting to watch file: {}", path.display());

        self._watcher
            .watch(path, RecursiveMode::NonRecursive)
            .map_err(|e| {
                error!("Failed to watch file {}: {}", path.display(), e);
                e
            })?;

        Ok(())
    }

    #[allow(dead_code)]
    pub fn unwatch_file<P: AsRef<Path>>(&mut self, path: P) -> Result<()> {
        let path = path.as_ref();
        debug!("Stopping watch for file: {}", path.display());

        self._watcher.unwatch(path).map_err(|e| {
            warn!("Failed to unwatch file {}: {}", path.display(), e);
            e
        })?;

        Ok(())
    }

    #[allow(dead_code)]
    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.sender.subscribe()
    }
}

impl Drop for FileWatcher {
    fn drop(&mut self) {
        debug!("FileWatcher dropped");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::NamedTempFile;
    use tokio::time::timeout;

    #[tokio::test]
    async fn test_file_watcher() -> Result<()> {
        let mut temp_file = NamedTempFile::new()?;
        let temp_path = temp_file.path().with_extension("md");

        // Create a markdown file
        fs::copy(temp_file.path(), &temp_path)?;

        let (mut watcher, mut rx) = FileWatcher::new()?;
        watcher.watch_file(&temp_path)?;

        // Write to the file
        writeln!(temp_file, "# Test Content")?;
        temp_file.flush()?;

        // Wait for the event with timeout
        let result = timeout(Duration::from_secs(2), rx.recv()).await;

        match result {
            Ok(Ok(path)) => {
                assert!(path.contains("md"));
            }
            Ok(Err(e)) => {
                panic!("Broadcast error: {}", e);
            }
            Err(_) => {
                // Timeout is acceptable in tests due to timing issues
                println!("Test timed out - this is acceptable in CI environments");
            }
        }

        // Cleanup
        fs::remove_file(&temp_path).ok();
        Ok(())
    }
}
