import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import texmath from "markdown-it-texmath";
import katex from "katex";
import hljs from "highlight.js";
import "katex/dist/katex.min.css";

import { parseFrontmatter } from "@/lib/frontmatter.ts";
import { slugify } from "@/lib/ast-tree.ts";
import { cn } from "@/lib/utils.ts";

const headingIds = new Set<string>();

function uniqueHeadingId(text: string): string {
    let id = slugify(text);
    if (headingIds.has(id)) {
        let n = 2;
        while (headingIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
    }
    headingIds.add(id);
    return id;
}

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

md.renderer.rules.heading_open = (tokens, idx) => {
    const token = tokens[idx];
    const inline = tokens[idx + 1];
    const text = inline ? inline.content : "";
    const id = uniqueHeadingId(text);
    return `<${token.tag} id="${id}">`;
};

export function Markdown({ content, className }: { content: string; className?: string }) {
    const { title, body } = useMemo(() => parseFrontmatter(content), [content]);
    const html = useMemo(() => {
        headingIds.clear();
        return md.render(body);
    }, [body]);
    return (
        <div className={cn("markdown-body", className)}>
            {title && <h1>{title}</h1>}
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}

export default Markdown;
