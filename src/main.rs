use anyhow::Result;
use clap::{Arg, Command};
use std::path::PathBuf;
use tracing::info;

mod file_watcher;
mod markdown;
mod server;

use server::LivedownServer;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    let matches = Command::new("livedown")
        .version("3.1.1")
        .author("Livedown Rust Port")
        .about("Live Markdown previews for your favourite editor")
        .subcommand(
            Command::new("start")
                .about("Start the Markdown preview server")
                .arg(
                    Arg::new("file")
                        .help("Markdown file to preview")
                        .required(true)
                        .index(1),
                )
                .arg(
                    Arg::new("port")
                        .long("port")
                        .short('p')
                        .help("Port to run the server on")
                        .default_value("1337")
                        .value_parser(clap::value_parser!(u16)),
                )
                .arg(
                    Arg::new("open")
                        .long("open")
                        .short('o')
                        .help("Open the preview in browser")
                        .action(clap::ArgAction::SetTrue),
                )
                .arg(
                    Arg::new("browser")
                        .long("browser")
                        .short('b')
                        .help("Browser command to use")
                        .value_name("COMMAND"),
                )
                .arg(
                    Arg::new("verbose")
                        .long("verbose")
                        .short('v')
                        .help("Enable verbose logging")
                        .action(clap::ArgAction::SetTrue),
                ),
        )
        .subcommand(
            Command::new("stop")
                .about("Stop the Markdown preview server")
                .arg(
                    Arg::new("port")
                        .long("port")
                        .short('p')
                        .help("Port of the server to stop")
                        .default_value("1337")
                        .value_parser(clap::value_parser!(u16)),
                ),
        )
        .get_matches();

    match matches.subcommand() {
        Some(("start", sub_matches)) => {
            let file_path = sub_matches.get_one::<String>("file").unwrap();
            let port = *sub_matches.get_one::<u16>("port").unwrap();
            let open_browser = sub_matches.get_flag("open");
            let browser_cmd = sub_matches.get_one::<String>("browser");
            let verbose = sub_matches.get_flag("verbose");

            if verbose {
                info!("Starting livedown server with verbose logging");
            }

            let file_path = PathBuf::from(file_path);
            if !file_path.exists() {
                eprintln!("Error: File '{}' does not exist", file_path.display());
                std::process::exit(1);
            }

            let server = LivedownServer::new(port)?;
            server
                .start(file_path, open_browser, browser_cmd.cloned())
                .await?;
        }
        Some(("stop", sub_matches)) => {
            let port = *sub_matches.get_one::<u16>("port").unwrap();
            stop_server(port).await?;
        }
        _ => {
            eprintln!("Use 'livedown start <file>' to start the server");
            eprintln!("Use 'livedown stop' to stop the server");
            eprintln!("Use 'livedown --help' for more information");
            std::process::exit(1);
        }
    }

    Ok(())
}

async fn stop_server(port: u16) -> Result<()> {
    let client = reqwest::Client::new();
    let url = format!("http://localhost:{}", port);

    match client.delete(&url).send().await {
        Ok(_) => {
            info!("Server stopped successfully");
        }
        Err(_) => {
            eprintln!("Cannot stop the server. Is it running on port {}?", port);
            std::process::exit(1);
        }
    }

    Ok(())
}
