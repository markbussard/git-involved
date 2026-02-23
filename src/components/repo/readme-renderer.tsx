"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkEmoji from "remark-emoji";
import rehypeRaw from "rehype-raw";

interface ReadmeRendererProps {
  content: string;
  repoFullName: string;
  defaultBranch?: string;
}

function isRelativeUrl(url: string): boolean {
  return !url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:");
}

function resolveGitHubUrl(src: string, repoFullName: string, defaultBranch: string): string {
  if (!isRelativeUrl(src)) return src;
  const cleaned = src.replace(/^\.\//, "");
  return `https://raw.githubusercontent.com/${repoFullName}/${defaultBranch}/${cleaned}`;
}

export default function ReadmeRenderer({ content, repoFullName, defaultBranch = "main" }: ReadmeRendererProps) {
  const components: Components = {
    img: ({ src, alt, ...props }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...props}
        src={src ? resolveGitHubUrl(src, repoFullName, defaultBranch) : undefined}
        alt={alt ?? ""}
      />
    ),
    a: ({ href, children, ...props }) => (
      <a
        {...props}
        href={href && isRelativeUrl(href) ? `https://github.com/${repoFullName}/blob/${defaultBranch}/${href.replace(/^\.\//, "")}` : href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  };

  return (
    <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-pre:bg-muted prose-pre:text-foreground prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkEmoji]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
