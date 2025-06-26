// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "/vite.svg";
import Markdown from "react-markdown";
import "./App.css";
import "katex/dist/katex.min.css"; // `rehype-katex` does not import the CSS for you
import { Button } from "./components/ui/button";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

function App() {
  // const [count, setCount] = useState(0);
  const markdown = `
  # Hello World

  This is a simple markdown editor.

  ## Features

  - Syntax highlighting
  - Live preview
  - Markdown shortcuts
  $$
  \\begin{aligned}
  & x = y + z \\\\
  & x = y - z \\
  & x = y \\cdot z \\
  & x = \\frac{y}{z}
  \\end{aligned}
  $$
  \`\`\`javascript
  function greet() {
    console.log("Hello, World!");
  }
  greet();
  \`\`\`
  `;
  return (
    <>
      <div className="mx-auto max-w-2xl my-5">
        <div className="prose">
          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {markdown}
          </Markdown>
        </div>
      </div>
    </>
  );
}

export default App;
