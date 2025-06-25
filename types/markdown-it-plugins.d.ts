declare module 'markdown-it-task-checkbox' {
  import MarkdownIt from 'markdown-it';

  interface TaskCheckboxOptions {
    disabled?: boolean;
    divWrap?: boolean;
    divClass?: string;
    idPrefix?: string;
    ulClass?: string;
    liClass?: string;
  }

  function taskCheckbox(md: MarkdownIt, options?: TaskCheckboxOptions): void;
  export = taskCheckbox;
}

declare module 'markdown-it-github-headings' {
  import MarkdownIt from 'markdown-it';

  interface GitHubHeadingsOptions {
    prefix?: string;
    suffix?: string;
    className?: string;
    linkClassName?: string;
    anchorClassName?: string;
    resetIds?: boolean;
  }

  function githubHeadings(md: MarkdownIt, options?: GitHubHeadingsOptions): void;
  export = githubHeadings;
}

declare module 'markdown-it-emoji' {
  import MarkdownIt from 'markdown-it';

  interface EmojiOptions {
    defs?: Record<string, string>;
    enabled?: string[];
    shortcuts?: Record<string, string | string[]>;
  }

  function emoji(md: MarkdownIt, options?: EmojiOptions): void;
  export = emoji;
}
