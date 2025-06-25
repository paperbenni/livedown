/* global io, hljs */

interface SocketIOStatic {
  connect(url: string): Socket;
}

interface Socket {
  on(event: string, callback: (data: any) => void): void;
  emit(event: string, data?: any): void;
}

interface HighlightJS {
  configure(options: { languages: string[] }): void;
  highlightBlock(block: HTMLElement): void;
}

declare const io: SocketIOStatic;
declare const hljs: HighlightJS;

class LivedownClient {
  private socket: Socket;

  constructor() {
    this.socket = io.connect(window.location.origin);
    this.init();
  }

  private init(): void {
    this.setupHighlighting();
    this.setupSocketListeners();
  }

  private setupHighlighting(): void {
    if (typeof hljs !== "undefined") {
      hljs.configure({ languages: [] });
    }
  }

  private setupSocketListeners(): void {
    this.socket.on("content", (data: string) => {
      this.updateContent(data);
    });

    this.socket.on("title", (data: string) => {
      this.updateTitle(data);
    });

    this.socket.on("kill", () => {
      this.closeWindow();
    });
  }

  private updateContent(data: string): void {
    const markdownBody = document.querySelector(".markdown-body");
    if (markdownBody) {
      markdownBody.innerHTML = data;
    }

    // Handle code highlighting
    this.highlightCode();
  }

  private highlightCode(): void {
    // Add class from code elements to their parent pre elements
    const codeElements = document.querySelectorAll("code");
    codeElements.forEach((codeElement) => {
      const className = codeElement.getAttribute("class");
      if (className && codeElement.parentElement) {
        codeElement.parentElement.classList.add(className);
      }
    });

    // Highlight all pre elements
    if (typeof hljs !== "undefined") {
      const preElements = document.querySelectorAll("pre");
      preElements.forEach((preElement) => {
        hljs.highlightBlock(preElement as HTMLElement);
      });
    }
  }

  private updateTitle(data: string): void {
    const titleElement = document.querySelector("title");
    if (titleElement) {
      titleElement.textContent = data;
    }
  }

  private closeWindow(): void {
    window.open("", "_self");
    window.close();
  }
}

// Initialize the client when the DOM is loaded
function initializeClient(): void {
  new LivedownClient();
}

// Wait for DOM to be ready and socket.io to be available
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeClient);
} else {
  initializeClient();
}
