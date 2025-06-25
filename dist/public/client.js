"use strict";
/* global io, hljs */
class LivedownClient {
    socket;
    constructor() {
        this.socket = io.connect(window.location.origin);
        this.init();
    }
    init() {
        this.setupHighlighting();
        this.setupSocketListeners();
    }
    setupHighlighting() {
        if (typeof hljs !== "undefined") {
            hljs.configure({ languages: [] });
        }
    }
    setupSocketListeners() {
        this.socket.on("content", (data) => {
            this.updateContent(data);
        });
        this.socket.on("title", (data) => {
            this.updateTitle(data);
        });
        this.socket.on("kill", () => {
            this.closeWindow();
        });
    }
    updateContent(data) {
        const markdownBody = document.querySelector(".markdown-body");
        if (markdownBody) {
            markdownBody.innerHTML = data;
        }
        // Handle code highlighting
        this.highlightCode();
    }
    highlightCode() {
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
                hljs.highlightBlock(preElement);
            });
        }
    }
    updateTitle(data) {
        const titleElement = document.querySelector("title");
        if (titleElement) {
            titleElement.textContent = data;
        }
    }
    closeWindow() {
        window.open("", "_self");
        window.close();
    }
}
// Initialize the client when the DOM is loaded
function initializeClient() {
    new LivedownClient();
}
// Wait for DOM to be ready and socket.io to be available
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeClient);
}
else {
    initializeClient();
}
//# sourceMappingURL=client.js.map