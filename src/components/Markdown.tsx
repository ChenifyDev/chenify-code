import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import texmath from "markdown-it-texmath";
import katex from "katex";
import hljs from "highlight.js";
import "katex/dist/katex.min.css";

import { cn } from "@/lib/utils.ts";

const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: true,
    highlight: (str, lang) => {
        const validLang = lang && hljs.getLanguage(lang);
        let code: string;
        try {
            code = validLang
                ? hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
                : hljs.highlightAuto(str).value;
        } catch {
            code = md.utils.escapeHtml(str);
        }
        return `<pre class="hljs"><code class="hljs language-${validLang ? lang : "plaintext"}">${code}</code></pre>`;
    },
});
md.use(texmath, { engine: katex, delimiters: "dollars", katexOptions: { throwOnError: false, strict: false } });

export function Markdown({ content, className }: { content: string; className?: string }) {
    const html = useMemo(() => md.render(content), [content]);
    return <div className={cn("markdown-body", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default Markdown;
