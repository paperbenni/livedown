interface ServerOptions {
    port?: number;
}
declare class LivedownServer {
    private app;
    private server;
    private io;
    private md;
    private sock;
    private watcher?;
    readonly port: number;
    readonly URI: string;
    constructor(opts?: ServerOptions);
    private setupMiddleware;
    private setupSocketHandlers;
    listen(callback?: (err?: Error) => void): void;
    watch(filePath: string): Promise<void>;
    stop(): Promise<void>;
    start(filePath: string): Promise<void>;
}
export default function createServer(opts?: ServerOptions): LivedownServer;
export { LivedownServer };
export type { ServerOptions };
//# sourceMappingURL=server.d.ts.map