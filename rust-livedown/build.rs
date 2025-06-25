use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=../client");
    println!("cargo:rerun-if-changed=../package.json");
    println!("cargo:rerun-if-changed=../vite.config.ts");

    // Build the client using the existing Vite build system
    let output = Command::new("bun")
        .args(&["run", "build:client"])
        .current_dir("..")
        .output()
        .expect("Failed to build client - make sure bun is installed");

    if !output.status.success() {
        panic!(
            "Client build failed:\nstdout: {}\nstderr: {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }

    println!("Client build completed successfully");
}
