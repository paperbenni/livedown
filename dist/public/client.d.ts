interface SocketIOStatic {
    connect(url: string): Socket;
}
interface Socket {
    on(event: string, callback: (data: any) => void): void;
    emit(event: string, data?: any): void;
}
interface HighlightJS {
    configure(options: {
        languages: string[];
    }): void;
    highlightBlock(block: HTMLElement): void;
}
declare const io: SocketIOStatic;
declare const hljs: HighlightJS;
declare class LivedownClient {
    private socket;
    constructor();
    private init;
    private setupHighlighting;
    private setupSocketListeners;
    private updateContent;
    private highlightCode;
    private updateTitle;
    private closeWindow;
}
declare function initializeClient(): void;
//# sourceMappingURL=client.d.ts.map