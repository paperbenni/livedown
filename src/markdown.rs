use pulldown_cmark::{html, CodeBlockKind, CowStr, Event, Options, Parser, Tag, TagEnd};
use regex::Regex;
use std::collections::HashMap;
use syntect::easy::HighlightLines;
use syntect::highlighting::{Style, ThemeSet};
use syntect::html::{styled_line_to_highlighted_html, IncludeBackground};
use syntect::parsing::SyntaxSet;
use syntect::util::as_24_bit_terminal_escaped;

pub struct MarkdownProcessor {
    syntax_set: SyntaxSet,
    theme_set: ThemeSet,
    theme_name: String,
    inline_math_regex: Regex,
    display_math_regex: Regex,
}

impl MarkdownProcessor {
    pub fn new() -> Self {
        let syntax_set = SyntaxSet::load_defaults_newlines();
        let theme_set = ThemeSet::load_defaults();

        // Create regex patterns for LaTeX math
        let inline_math_regex = Regex::new(r"\$([^$\n]+?)\$").unwrap();
        let display_math_regex = Regex::new(r"\$\$([^$]+?)\$\$").unwrap();

        Self {
            syntax_set,
            theme_set,
            theme_name: "base16-ocean.dark".to_string(),
            inline_math_regex,
            display_math_regex,
        }
    }

    pub fn render(&self, markdown: &str) -> String {
        let mut options = Options::empty();
        options.insert(Options::ENABLE_STRIKETHROUGH);
        options.insert(Options::ENABLE_TABLES);
        options.insert(Options::ENABLE_FOOTNOTES);
        options.insert(Options::ENABLE_TASKLISTS);
        options.insert(Options::ENABLE_SMART_PUNCTUATION);
        options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

        let parser = Parser::new_ext(markdown, options);
        let events = self.process_events(parser);

        let mut html_output = String::new();
        html::push_html(&mut html_output, events.into_iter());

        // Process LaTeX math first, then emojis
        let latex_processed = self.process_latex_math(&html_output);
        self.process_emojis(&latex_processed)
    }

    fn process_latex_math(&self, html: &str) -> String {
        // First process display math ($$...$$) to avoid conflicts with inline math
        let display_processed =
            self.display_math_regex
                .replace_all(html, |caps: &regex::Captures| {
                    let math_content = &caps[1];
                    format!(
                        "<span class=\"katex-display\">\\[{}\\]</span>",
                        math_content
                    )
                });

        // Then process inline math ($...$)
        let inline_processed =
            self.inline_math_regex
                .replace_all(&display_processed, |caps: &regex::Captures| {
                    let math_content = &caps[1];
                    format!("<span class=\"katex\">\\({}\\)</span>", math_content)
                });

        inline_processed.to_string()
    }

    fn process_events<'a>(&self, parser: Parser<'a>) -> Vec<Event<'a>> {
        let mut events = Vec::new();
        let mut in_code_block = false;
        let mut code_block_lang = String::new();
        let mut code_block_content = String::new();

        for event in parser {
            match event {
                Event::Start(Tag::CodeBlock(CodeBlockKind::Fenced(lang))) => {
                    in_code_block = true;
                    code_block_lang = lang.to_string();
                    code_block_content.clear();
                }
                Event::End(TagEnd::CodeBlock) if in_code_block => {
                    in_code_block = false;
                    let highlighted = self.highlight_code(&code_block_content, &code_block_lang);
                    events.push(Event::Html(CowStr::Boxed(highlighted.into_boxed_str())));
                }
                Event::Text(text) if in_code_block => {
                    code_block_content.push_str(&text);
                }
                Event::Start(Tag::Heading {
                    level,
                    id,
                    classes,
                    attrs,
                }) => {
                    // Add anchor links to headings
                    let heading_id = id.clone().unwrap_or_else(|| {
                        // Generate ID from heading text - we'll need to collect the text
                        format!("heading-{}", events.len()).into()
                    });

                    events.push(Event::Start(Tag::Heading {
                        level,
                        id: Some(heading_id.clone()),
                        classes,
                        attrs,
                    }));
                }
                Event::Start(Tag::Item) => {
                    // Enhanced task list support
                    events.push(Event::Start(Tag::Item));
                }
                _ => {
                    if !in_code_block {
                        events.push(event);
                    }
                }
            }
        }

        events
    }

    fn highlight_code(&self, code: &str, lang: &str) -> String {
        if lang.is_empty() || code.trim().is_empty() {
            return format!("<pre><code>{}</code></pre>", html_escape::encode_text(code));
        }

        let syntax = self
            .syntax_set
            .find_syntax_by_token(lang)
            .or_else(|| self.syntax_set.find_syntax_by_extension(lang))
            .unwrap_or_else(|| self.syntax_set.find_syntax_plain_text());

        let theme = &self.theme_set.themes[&self.theme_name];
        let mut highlighter = HighlightLines::new(syntax, theme);

        let mut highlighted_html = String::new();

        for line in code.lines() {
            let ranges: Vec<(Style, &str)> =
                highlighter.highlight_line(line, &self.syntax_set).unwrap();
            let _escaped = as_24_bit_terminal_escaped(&ranges[..], false);
            let html_line =
                styled_line_to_highlighted_html(&ranges[..], IncludeBackground::No).unwrap();
            highlighted_html.push_str(&html_line);
            highlighted_html.push('\n');
        }

        format!(
            "<pre class=\"highlight highlight-{}\"><code class=\"language-{}\">{}</code></pre>",
            lang, lang, highlighted_html
        )
    }

    fn process_emojis(&self, html: &str) -> String {
        // Simple emoji replacement - you could use the emojis crate for more comprehensive support
        let emoji_map = self.get_emoji_map();
        let mut result = html.to_string();

        for (code, emoji) in emoji_map {
            result = result.replace(&format!(":{}:", code), emoji);
        }

        result
    }

    fn get_emoji_map(&self) -> HashMap<&'static str, &'static str> {
        let mut map = HashMap::new();

        // Common emojis
        map.insert("smile", "😄");
        map.insert("laughing", "😆");
        map.insert("wink", "😉");
        map.insert("blush", "😊");
        map.insert("heart", "❤️");
        map.insert("broken_heart", "💔");
        map.insert("thumbsup", "👍");
        map.insert("thumbsdown", "👎");
        map.insert("ok_hand", "👌");
        map.insert("point_right", "👉");
        map.insert("point_left", "👈");
        map.insert("point_up", "👆");
        map.insert("point_down", "👇");
        map.insert("clap", "👏");
        map.insert("wave", "👋");
        map.insert("fire", "🔥");
        map.insert("rocket", "🚀");
        map.insert("star", "⭐");
        map.insert("warning", "⚠️");
        map.insert("exclamation", "❗");
        map.insert("question", "❓");
        map.insert("heavy_check_mark", "✅");
        map.insert("x", "❌");
        map.insert("o", "⭕");
        map.insert("bulb", "💡");
        map.insert("gear", "⚙️");
        map.insert("wrench", "🔧");
        map.insert("hammer", "🔨");
        map.insert("lock", "🔒");
        map.insert("unlock", "🔓");
        map.insert("key", "🔑");
        map.insert("mag", "🔍");
        map.insert("computer", "💻");
        map.insert("phone", "📱");
        map.insert("email", "📧");
        map.insert("book", "📖");
        map.insert("pencil", "✏️");
        map.insert("memo", "📝");
        map.insert("clipboard", "📋");
        map.insert("calendar", "📅");
        map.insert("clock", "🕐");
        map.insert("hourglass", "⏳");

        map
    }
}

impl Default for MarkdownProcessor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_markdown() {
        let processor = MarkdownProcessor::new();
        let result = processor.render("# Hello World\n\nThis is **bold** text.");
        assert!(result.contains("<h1"));
        assert!(result.contains("<strong>bold</strong>"));
    }

    #[test]
    fn test_code_highlighting() {
        let processor = MarkdownProcessor::new();
        let result = processor.render("```rust\nfn main() {\n    println!(\"Hello\");\n}\n```");
        assert!(result.contains("highlight-rust"));
        assert!(result.contains("language-rust"));
    }

    #[test]
    fn test_emoji_replacement() {
        let processor = MarkdownProcessor::new();
        let result = processor.render("Hello :smile: world :heart:");
        assert!(result.contains("😄"));
        assert!(result.contains("❤️"));
    }

    #[test]
    fn test_latex_math() {
        let processor = MarkdownProcessor::new();

        // Test inline math
        let result = processor.render("This is inline math: $E = mc^2$");
        assert!(result.contains("<span class=\"katex\">\\(E = mc^2\\)</span>"));

        // Test display math
        let result = processor
            .render("Display math:\n\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$");
        assert!(result.contains("<span class=\"katex-display\">\\[\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\\]</span>"));

        // Test multi-line display math with newlines
        let multiline_math = "$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$";
        let result = processor.render(multiline_math);
        assert!(result.contains("<span class=\"katex-display\">\\[\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n\\]</span>"));
    }

    #[test]
    fn test_task_lists() {
        let processor = MarkdownProcessor::new();
        let result = processor.render("- [x] Done\n- [ ] Todo");
        // Basic test - the actual task list rendering depends on the pulldown-cmark version
        assert!(result.contains("<li>"));
    }
}
