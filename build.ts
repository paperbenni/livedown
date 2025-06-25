#!/usr/bin/env bun

import { $ } from "bun";
import { copyFile, mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function buildClient(): Promise<void> {
  console.log("🔨 Building client TypeScript...");

  await ensureDir("public");

  // Compile client TypeScript to JavaScript using the client tsconfig
  try {
    await $`tsc -p tsconfig.client.json`;
    console.log("✅ Client TypeScript compiled successfully!");
  } catch (error) {
    console.error("❌ Client build failed:", error);
    process.exit(1);
  }
}

async function buildServer(): Promise<void> {
  console.log("🔨 Building server TypeScript...");

  try {
    await $`tsc`;
    console.log("✅ Server TypeScript compiled successfully!");
  } catch (error) {
    console.error("❌ Server build failed:", error);
    process.exit(1);
  }
}

async function copyStaticFiles(): Promise<void> {
  console.log("📁 Copying static files...");

  // Copy usage.txt to dist
  if (existsSync("src/bin/usage.txt")) {
    await ensureDir("dist/bin");
    await copyFile("src/bin/usage.txt", "dist/bin/usage.txt");
    console.log("✅ Copied usage.txt");
  }

  // Copy index.html to dist
  if (existsSync("index.html")) {
    await copyFile("index.html", "dist/index.html");
    console.log("✅ Copied index.html");
  }

  // Copy public directory (vendor files, etc.)
  if (existsSync("public")) {
    await ensureDir("dist/public");
    await copyDirectory("public", "dist/public");
    console.log("✅ Copied public directory");
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await readdir(src);

  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const entryStat = await stat(srcPath);

    if (entryStat.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function makeExecutable(): Promise<void> {
  if (existsSync("dist/bin/livedown.js")) {
    try {
      await $`chmod +x dist/bin/livedown.js`;
      console.log("✅ Made livedown executable");
    } catch (error) {
      console.warn("⚠️  Could not make livedown executable:", error);
    }
  }
}

async function main(): Promise<void> {
  try {
    console.log("🚀 Starting build process...");

    await buildServer();
    await buildClient();
    await copyStaticFiles();
    await makeExecutable();

    console.log("🎉 Build completed successfully!");
  } catch (error) {
    console.error("💥 Build failed:", error);
    process.exit(1);
  }
}

main();
