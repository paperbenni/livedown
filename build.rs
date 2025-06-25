use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=client");
    println!("cargo:rerun-if-changed=package.json");
    println!("cargo:rerun-if-changed=vite.config.ts");

    // Build the client using the existing Vite build system
    let output = Command::new("bun")
        .args(&["run", "vite", "build"])
        .current_dir(".")
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
    
    // Copy the built files to the static directory
    let output = Command::new("mkdir")
        .args(&["-p", "static"])
        .output()
        .expect("Failed to create static directory");
    
    if !output.status.success() {
        panic!("Failed to create static directory");
    }
    
    let output = Command::new("cp")
        .args(&["-r", "./public/dist/*", "./static/"])
        .output()
        .expect("Failed to copy built files");
    
    if !output.status.success() {
        panic!("Failed to copy built files:\nstdout: {}\nstderr: {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }
    
    if !output.status.success() {
        panic!("Failed to copy built files");
    }

    println!("Client build completed successfully");
    
    // Copy the built files to the static directory
    let output = Command::new("mkdir")
        .args(&["-p", "static"])
        .output()
        .expect("Failed to create static directory");
    
    if !output.status.success() {
        panic!("Failed to create static directory");
    }
    
    let output = Command::new("cp")
        .args(&["-r", "../public/dist/*", "static/"])
        .output()
        .expect("Failed to copy built files");
    
    if !output.status.success() {
        panic!("Failed to copy built files");
    }
}
