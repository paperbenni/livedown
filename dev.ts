#!/usr/bin/env bun

import { watch } from 'fs';
import { spawn } from 'child_process';
import path from 'path';

let serverProcess: any = null;

function startServer() {
  console.log('🚀 Starting development server...');

  if (serverProcess) {
    serverProcess.kill();
  }

  serverProcess = spawn('bun', ['run', 'src/server.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  serverProcess.on('error', (error: Error) => {
    console.error('❌ Server error:', error);
  });

  serverProcess.on('exit', (code: number) => {
    if (code !== 0) {
      console.log(`🔄 Server exited with code ${code}, restarting...`);
    }
  });
}

function setupWatcher() {
  const watchPaths = ['src', 'index.html', 'public'];

  watchPaths.forEach(watchPath => {
    if (require('fs').existsSync(watchPath)) {
      watch(watchPath, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.ts') || filename.endsWith('.js') || filename.endsWith('.html'))) {
          console.log(`📝 File changed: ${filename}`);
          startServer();
        }
      });
      console.log(`👀 Watching ${watchPath} for changes...`);
    }
  });
}

function cleanup() {
  if (serverProcess) {
    console.log('\n🛑 Stopping development server...');
    serverProcess.kill();
  }
  process.exit(0);
}

// Handle cleanup on exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

console.log('🔧 Starting Livedown development mode...');
setupWatcher();
startServer();
