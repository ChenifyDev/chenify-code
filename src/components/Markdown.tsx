import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import texmath from "markdown-it-texmath";
import katex from "katex";
import "katex/dist/katex.min.css";

import { cn } from "@/lib/utils.ts";

const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: true,
});
md.use(texmath, { engine: katex, delimiters: "dollars", katexOptions: { throwOnError: false, strict: false } });

export function Markdown({ content, className }: { content: string; className?: string }) {
    const html = useMemo(() => md.render(content), [content]);
    return <div className={cn("markdown-body", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default Markdown;
