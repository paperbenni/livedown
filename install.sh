#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/shime/livedown.git"
INSTALL_DIR="$HOME/.local/share/livedown"
BIN_DIR="$HOME/.local/bin"

print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║                        Livedown with LaTeX Support                       ║"
    echo "║                       Enhanced Markdown Previewer                        ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

check_requirements() {
    print_step "Checking requirements..."

    # Check for required tools
    local missing_tools=()

    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi

    if ! command -v node &> /dev/null; then
        missing_tools+=("node (>=18.0.0)")
    fi

    # Check for package managers (at least one should be available)
    local has_package_manager=false
    if command -v bun &> /dev/null; then
        print_success "Found Bun runtime"
        has_package_manager=true
        PACKAGE_MANAGER="bun"
    elif command -v npm &> /dev/null; then
        print_success "Found npm"
        has_package_manager=true
        PACKAGE_MANAGER="npm"
    fi

    if [ "$has_package_manager" = false ]; then
        missing_tools+=("bun or npm")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        echo
        echo "Please install the missing tools and try again."
        echo
        echo "Installation guides:"
        echo "  • Bun: https://bun.sh/docs/installation"
        echo "  • Node.js: https://nodejs.org/"
        echo "  • Git: https://git-scm.com/downloads"
        exit 1
    fi

    print_success "All requirements satisfied"
}

cleanup_existing() {
    if [ -d "$INSTALL_DIR" ]; then
        print_step "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
        print_success "Cleaned up existing installation"
    fi

    # Remove existing symlink if it exists
    if [ -L "$BIN_DIR/livedown" ]; then
        rm "$BIN_DIR/livedown"
    fi
}

clone_repository() {
    print_step "Cloning livedown repository..."
    git clone "$REPO_URL" "$INSTALL_DIR" --depth 1 --quiet
    print_success "Repository cloned successfully"
}

install_dependencies() {
    print_step "Installing dependencies..."
    cd "$INSTALL_DIR"

    if [ "$PACKAGE_MANAGER" = "bun" ]; then
        bun install --silent
    else
        npm install --silent
    fi

    print_success "Dependencies installed"
}

build_project() {
    print_step "Building livedown..."
    cd "$INSTALL_DIR"

    if [ "$PACKAGE_MANAGER" = "bun" ]; then
        bun run build > /dev/null 2>&1
    else
        npm run build > /dev/null 2>&1
    fi

    print_success "Build completed"
}

create_symlink() {
    print_step "Creating global executable..."

    # Ensure bin directory exists
    mkdir -p "$BIN_DIR"

    # Create symlink
    ln -sf "$INSTALL_DIR/dist/bin/livedown.js" "$BIN_DIR/livedown"
    chmod +x "$INSTALL_DIR/dist/bin/livedown.js"

    print_success "Global executable created"
}

check_path() {
    if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
        print_warning "Warning: $BIN_DIR is not in your PATH"
        echo
        echo "Add the following line to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
        echo "export PATH=\"\$PATH:$BIN_DIR\""
        echo
        echo "Then restart your terminal or run: source ~/.bashrc"
        return 1
    fi
    return 0
}

verify_installation() {
    print_step "Verifying installation..."

    if [ -x "$BIN_DIR/livedown" ]; then
        if check_path; then
            # Test the command
            if "$BIN_DIR/livedown" --help > /dev/null 2>&1; then
                print_success "Installation verified successfully"
                return 0
            else
                print_error "Installation verification failed - command doesn't work"
                return 1
            fi
        else
            print_warning "Installation completed but PATH needs to be updated"
            return 2
        fi
    else
        print_error "Installation failed - executable not found"
        return 1
    fi
}

print_usage() {
    echo
    echo -e "${GREEN}🎉 Livedown with LaTeX support is now installed!${NC}"
    echo
    echo "Features:"
    echo "  • Live markdown preview with auto-reload"
    echo "  • LaTeX math rendering (inline: \$math\$ and display: \$\$math\$\$)"
    echo "  • GitHub flavored markdown"
    echo "  • Syntax highlighting"
    echo "  • Emoji support"
    echo "  • Task lists"
    echo "  • Modern TypeScript codebase"
    echo
    echo "Usage examples:"
    echo "  livedown start README.md --open"
    echo "  livedown start document.md --port 3000"
    echo "  livedown start notes.md --open --browser firefox"
    echo "  livedown stop"
    echo
    echo "For more options:"
    echo "  livedown --help"
    echo
}

main() {
    print_header

    # Handle command line options
    case "${1:-}" in
        --uninstall)
            print_step "Uninstalling livedown..."
            rm -rf "$INSTALL_DIR"
            rm -f "$BIN_DIR/livedown"
            print_success "Livedown uninstalled successfully"
            exit 0
            ;;
        --help|-h)
            echo "Livedown Installer"
            echo
            echo "Usage:"
            echo "  $0              Install livedown"
            echo "  $0 --uninstall  Remove livedown"
            echo "  $0 --help       Show this help"
            echo
            exit 0
            ;;
    esac

    check_requirements
    cleanup_existing
    clone_repository
    install_dependencies
    build_project
    create_symlink

    case $(verify_installation) in
        0)
            print_usage
            ;;
        1)
            print_error "Installation failed"
            exit 1
            ;;
        2)
            print_usage
            echo -e "${YELLOW}Note: You may need to update your PATH as shown above.${NC}"
            ;;
    esac
}

# Handle script interruption
trap 'print_error "Installation interrupted"; exit 1' INT TERM

main "$@"
