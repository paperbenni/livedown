import path from "path";
import fs from "fs/promises";
import express, { Application, Request, Response } from "express";
import { createServer as createHttpServer, Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import * as chokidar from "chokidar";
import bodyParser from "body-parser";
import MarkdownIt from "markdown-it";
import markdownItTaskCheckbox from "markdown-it-task-checkbox";
import markdownItEmoji from "markdown-it-emoji";
import markdownItGitHubHeadings from "markdown-it-github-headings";
import { isPathRelative } from "./utils.js";

interface ServerOptions {
  port?: number;
}

interface SocketWrapper {
  emit: (event: string, data?: any) => void;
}

class LivedownServer {
  private app: Application;
  private server: HttpServer;
  private io: SocketIOServer;
  private md: MarkdownIt;
  private sock: SocketWrapper;
  private watcher?: chokidar.FSWatcher;

  public readonly port: number;
  public readonly URI: string;

  constructor(opts: ServerOptions = {}) {
    this.port = opts.port || 1337;
    this.URI = `http://localhost:${this.port}`;
    this.sock = { emit: () => {} };

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

  private setupMiddleware(): void {
    this.app.use(bodyParser.json());
  }

  private setupSocketHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      this.sock = socket;
    });
  }

  public listen(callback?: (err?: Error) => void): void {
    this.server.listen(this.port, callback);
  }

  public async watch(filePath: string): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }

    this.watcher = chokidar.watch(filePath);

    this.watcher.on("change", async (watchedPath: string) => {
      try {
        const data = await fs.readFile(watchedPath, "utf8");
        const renderedContent = this.md.render(data || "");
        this.sock.emit("content", renderedContent);
      } catch (error) {
        console.error("Error reading file:", error);
      }
    });
  }

  public async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }

    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async start(filePath: string): Promise<void> {
    const sendFileOpts: any = {};

    if (isPathRelative(filePath)) {
      sendFileOpts.root = path.resolve(process.cwd());
    }

    // Setup routes
    this.app.get("/", (req: Request, res: Response) => {
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

    this.app.delete("/", (req: Request, res: Response) => {
      this.io.emit("kill");
      res.end();
      process.exit(0);
    });

    // Setup socket connection handler
    this.io.on("connection", async (socket: Socket) => {
      this.sock = socket;
      this.sock.emit("title", path.basename(filePath));

      try {
        const data = await fs.readFile(filePath, "utf8");
        const renderedContent = this.md.render(data || "");
        this.sock.emit("content", renderedContent);
      } catch (error) {
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
        } else {
          resolve();
        }
      });
    });
  }
}

export default function createServer(opts?: ServerOptions): LivedownServer {
  return new LivedownServer(opts);
}

export { LivedownServer };
export type { ServerOptions };
