#!/usr/bin/env node

import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

async function postbuild() {
  console.log('Running postbuild tasks...');

  try {
    // Ensure dist/bin directory exists
    const distBinDir = 'dist/bin';
    if (!existsSync(distBinDir)) {
      await mkdir(distBinDir, { recursive: true });
    }

    // Copy usage.txt to dist/bin
    const srcUsage = 'src/bin/usage.txt';
    const destUsage = 'dist/bin/usage.txt';

    if (existsSync(srcUsage)) {
      await copyFile(srcUsage, destUsage);
      console.log('✓ Copied usage.txt to dist/bin/');
    } else {
      console.warn('⚠️  usage.txt not found in src/bin/');
    }

    // Make the CLI executable
    if (existsSync('dist/bin/livedown.js')) {
      try {
        const { chmod } = await import('fs/promises');
        await chmod('dist/bin/livedown.js', '755');
        console.log('✓ Made livedown.js executable');
      } catch (error) {
        console.warn('⚠️  Could not make livedown.js executable:', error.message);
      }
    }

    console.log('✅ Postbuild tasks completed successfully');
  } catch (error) {
    console.error('❌ Postbuild failed:', error);
    process.exit(1);
  }
}

postbuild();
