import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  base: "/",
  build: {
    outDir: "../public/dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: "esbuild",
    target: "es2020",
  },
  server: {
    port: 3000,
    host: true,
    cors: true,
    proxy: {
      "/socket.io": {
        target: "http://localhost:1337",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  css: {
    devSourcemap: true,
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
  },
  optimizeDeps: {
    include: ["socket.io-client", "highlight.js"],
  },
});
