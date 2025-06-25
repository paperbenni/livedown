import { io, Socket } from "socket.io-client";
import hljs from "highlight.js";

class LivedownClient {
  private socket: Socket;
  private markdownBody: HTMLElement | null = null;
  private connectionStatus: HTMLElement | null = null;

  constructor() {
    this.socket = io(window.location.origin);
    this.init();
  }

  private init(): void {
    this.setupDOM();
    this.setupConnectionStatus();
    this.setupHighlighting();
    this.setupSocketListeners();
  }

  private setupDOM(): void {
    this.markdownBody = document.querySelector(".markdown-body");
    if (!this.markdownBody) {
      console.warn("Markdown body element not found");
      // Create markdown body if it doesn't exist
      this.markdownBody = document.createElement("article");
      this.markdownBody.className = "markdown-body";
      document.body.appendChild(this.markdownBody);
    }
  }

  private setupConnectionStatus(): void {
    this.connectionStatus = document.createElement("div");
    this.connectionStatus.className = "connection-status connecting";
    this.connectionStatus.textContent = "Connecting...";
    document.body.appendChild(this.connectionStatus);
  }

  private updateConnectionStatus(
    status: "connected" | "disconnected" | "connecting",
  ): void {
    if (!this.connectionStatus) return;

    this.connectionStatus.className = `connection-status ${status}`;

    switch (status) {
      case "connected":
        this.connectionStatus.textContent = "Connected";
        break;
      case "disconnected":
        this.connectionStatus.textContent = "Disconnected";
        break;
      case "connecting":
        this.connectionStatus.textContent = "Connecting...";
        break;
    }

    // Auto-hide connected status after 3 seconds
    if (status === "connected") {
      setTimeout(() => {
        if (this.connectionStatus && this.socket.connected) {
          this.connectionStatus.style.opacity = "0.3";
        }
      }, 3000);
    } else {
      this.connectionStatus.style.opacity = "1";
    }
  }

  private setupHighlighting(): void {
    hljs.configure({
      languages: [],
      ignoreUnescapedHTML: true,
    });
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

    this.socket.on("connect", () => {
      console.log("✅ Connected to livedown server");
      this.updateConnectionStatus("connected");
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log("❌ Disconnected from livedown server:", reason);
      this.updateConnectionStatus("disconnected");
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("💥 Connection error:", error);
      this.updateConnectionStatus("disconnected");
    });

    this.socket.on("reconnect", () => {
      console.log("🔄 Reconnected to livedown server");
      this.updateConnectionStatus("connected");
    });

    this.socket.on("reconnect_attempt", () => {
      console.log("🔄 Attempting to reconnect...");
      this.updateConnectionStatus("connecting");
    });
  }

  private updateContent(data: string): void {
    if (!this.markdownBody) {
      console.error("Cannot update content: markdown body element not found");
      return;
    }

    this.markdownBody.innerHTML = data;
    this.highlightCode();
    this.setupLinks();
    this.setupTaskLists();
  }

  private highlightCode(): void {
    // Add language classes from code elements to their parent pre elements
    const codeElements = document.querySelectorAll('code[class*="language-"]');
    codeElements.forEach((codeElement) => {
      const className = codeElement.getAttribute("class");
      if (className && codeElement.parentElement) {
        codeElement.parentElement.classList.add(className);
      }
    });

    // Highlight all code blocks
    const preElements = document.querySelectorAll("pre code");
    preElements.forEach((element) => {
      hljs.highlightElement(element as HTMLElement);
    });

    // Also highlight inline code if it has a language class
    const inlineCodeElements = document.querySelectorAll(
      'code[class*="language-"]:not(pre code)',
    );
    inlineCodeElements.forEach((element) => {
      hljs.highlightElement(element as HTMLElement);
    });
  }

  private setupLinks(): void {
    // Make external links open in new tab
    const links = document.querySelectorAll('a[href^="http"]');
    links.forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });

    // Handle internal links (same-page anchors)
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    internalLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const href = link.getAttribute("href");
        if (href) {
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    });
  }

  private setupTaskLists(): void {
    // Make task list checkboxes interactive (if they aren't disabled)
    const checkboxes = document.querySelectorAll(
      ".task-list-item-checkbox:not([disabled])",
    );
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const listItem = target.closest(".task-list-item");
        if (listItem) {
          listItem.classList.toggle("completed", target.checked);
        }
      });
    });
  }

  private updateTitle(data: string): void {
    const titleElement = document.querySelector("title");
    if (titleElement) {
      titleElement.textContent = data;
    }

    // Also update the page header if it exists and is empty
    const headerElement = document.querySelector("h1");
    if (headerElement && !headerElement.textContent?.trim()) {
      headerElement.textContent = data;
    }
  }

  private closeWindow(): void {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.innerHTML = `
      <div class="text-center">
        <div class="text-lg font-semibold mb-2">🚀 Livedown Server Stopped</div>
        <div class="text-gray-600 dark:text-gray-400">Closing window in 3 seconds...</div>
      </div>
    `;

    document.body.appendChild(notification);

    let countdown = 3;
    const countdownInterval = setInterval(() => {
      countdown--;
      const countdownText = notification.querySelector("div:last-child");
      if (countdownText) {
        countdownText.textContent =
          countdown > 0
            ? `Closing window in ${countdown} seconds...`
            : "Closing now...";
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(countdownInterval);
      window.close();
      window.location.href = "about:blank";
    }, 3000);
  }

  public destroy(): void {
    this.socket.disconnect();
    if (this.connectionStatus) {
      this.connectionStatus.remove();
    }
  }
}

// Initialize the client when the DOM is ready
function initializeClient(): void {
  console.log("🚀 Initializing Livedown client...");

  const client = new LivedownClient();

  // Store client instance globally for debugging
  (window as Window & { livedownClient?: typeof client }).livedownClient =
    client;

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    client.destroy();
  });

  // Handle visibility change to pause/resume connection
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      console.log("📱 Page hidden, maintaining connection...");
    } else {
      console.log("👁️ Page visible, ensuring connection...");
    }
  });
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeClient);
} else {
  initializeClient();
}

// Export for potential external use
export { LivedownClient };
