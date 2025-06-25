# Livedown

![](https://twobucks.co/assets/livedown.gif)

[![Build Status](https://travis-ci.org/shime/livedown.svg)](https://travis-ci.org/shime/livedown)
[![Downloads](https://img.shields.io/npm/dt/livedown.svg)](https://npmjs.org/package/livedown)

Live markdown previews for your favorite editor. Now powered by Rust for blazing fast performance, with TypeScript frontend and modern web technologies.

* [Vim plugin](https://github.com/shime/vim-livedown)
* [Emacs plugin](https://github.com/shime/emacs-livedown)
* [Sublime plugin](https://github.com/shime/sublime-livedown)
* [Kakoune plugin](https://github.com/Delapouite/kakoune-livedown)

## Features

* Emojis :sparkles: :smile: :tada:
* GitHub flavored clickable headings/permalinks
* GitHub flavored checkboxes
* Real-time instant preview powered by Rust backend
* KaTeX LaTeX math rendering support ($...$ and $$...$$ blocks)
* Multi-line math environments (align, cases, matrices)
* Blazing fast file watching and updates
* Modern TypeScript codebase
* Vite-powered frontend with hot module replacement
* Socket.io for real-time communication
* Bun runtime support

And more!

## Installation

### Global Installation (recommended)

    $ npm install -g livedown

### With Bun (modern runtime)

    $ bun install -g livedown

## Usage

### Basic Usage

    $ livedown start README.md --open
    $ livedown start README.md --port 1337
    $ livedown stop

### Command Line Options

    $ livedown --help

### Development

If you're developing or contributing to livedown:

```bash
# Clone the repository
git clone https://github.com/shime/livedown.git
cd livedown

# Install dependencies with Bun (recommended)
bun install

# Build the project
bun run build

# Run in development mode with hot reload
bun run dev

# Test the CLI
bun run dist/bin/livedown.js start test.md --open --verbose
```

### Modern Architecture

This version of livedown has been modernized with:

- **TypeScript**: Full type safety and better developer experience
- **Vite**: Lightning-fast development server and optimized builds
- **Modern Dependencies**: Updated to latest versions of all packages
- **Bun Support**: Optimized for the modern JavaScript runtime
- **ES Modules**: Modern module system throughout
- **Socket.io v4**: Real-time communication with better performance

## Alternatives

* [vim-instant-markdown](https://github.com/suan/vim-instant-markdown)
* [octodown](https://github.com/ianks/octodown)
* [vmd](https://github.com/yoshuawuyts/vmd)
* [markdown-preview](https://github.com/yuanchuan/markdown-preview)
* [grip](https://github.com/joeyespo/grip)
* [gfms](https://github.com/youurayy/gfms)

## License

MIT
