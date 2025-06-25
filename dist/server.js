import path from "path";
import fs from "fs/promises";
import express from "express";
import { createServer as createHttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import * as chokidar from "chokidar";
import bodyParser from "body-parser";
import MarkdownIt from "markdown-it";
import markdownItTaskCheckbox from "markdown-it-task-checkbox";
import markdownItEmoji from "markdown-it-emoji";
import markdownItGitHubHeadings from "markdown-it-github-headings";
import { isPathRelative } from "./utils.js";
class LivedownServer {
    app;
    server;
    io;
    md;
    sock;
    watcher;
    port;
    URI;
    constructor(opts = {}) {
        this.port = opts.port || 1337;
        this.URI = `http://localhost:${this.port}`;
        this.sock = { emit: () => { } };
        // Initialize Express app
        this.app = express();
        this.server = createHttpServer(this.app);
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });
        // Initialize Markdown parser
        this.md = new MarkdownIt({
            html: true,
            linkify: true,
        });
        this.md.use(markdownItTaskCheckbox);
        this.md.use(markdownItEmoji);
        this.md.use(markdownItGitHubHeadings, {
            prefix: "",
        });
        this.setupMiddleware();
        this.setupSocketHandlers();
    }
    setupMiddleware() {
        this.app.use(bodyParser.json());
    }
    setupSocketHandlers() {
        this.io.on("connection", (socket) => {
            this.sock = socket;
        });
    }
    listen(callback) {
        this.server.listen(this.port, callback);
    }
    async watch(filePath) {
        if (this.watcher) {
            await this.watcher.close();
        }
        this.watcher = chokidar.watch(filePath);
        this.watcher.on("change", async (watchedPath) => {
            try {
                const data = await fs.readFile(watchedPath, "utf8");
                const renderedContent = this.md.render(data || "");
                this.sock.emit("content", renderedContent);
            }
            catch (error) {
                console.error("Error reading file:", error);
            }
        });
    }
    async stop() {
        if (this.watcher) {
            await this.watcher.close();
        }
        return new Promise((resolve, reject) => {
            this.server.close((err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async start(filePath) {
        const sendFileOpts = {};
        if (isPathRelative(filePath)) {
            sendFileOpts.root = path.resolve(process.cwd());
        }
        // Setup routes
        this.app.get("/", (req, res) => {
            // In development, serve from client directory, in production from built files
            const isDev = process.env.NODE_ENV === "development";
            const htmlPath = isDev
                ? path.join(process.cwd(), "client", "index.html")
                : path.join(process.cwd(), "public", "dist", "index.html");
            res.sendFile(htmlPath);
        });
        // Serve static files
        this.app.use(express.static(path.join(process.cwd(), "public", "dist")));
        this.app.use(express.static(path.join(process.cwd(), "public")));
        this.app.use(express.static(path.dirname(filePath)));
        this.app.delete("/", (req, res) => {
            this.io.emit("kill");
            res.end();
            process.exit(0);
        });
        // Setup socket connection handler
        this.io.on("connection", async (socket) => {
            this.sock = socket;
            this.sock.emit("title", path.basename(filePath));
            try {
                const data = await fs.readFile(filePath, "utf8");
                const renderedContent = this.md.render(data || "");
                this.sock.emit("content", renderedContent);
            }
            catch (error) {
                console.error("Error reading initial file:", error);
            }
        });
        // Start watching the file
        await this.watch(filePath);
        // Start the server
        return new Promise((resolve, reject) => {
            this.listen((err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
export default function createServer(opts) {
    return new LivedownServer(opts);
}
export { LivedownServer };
//# sourceMappingURL=server.js.map