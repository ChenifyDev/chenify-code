import { fromMarkdown } from "mdast-util-from-markdown";
import type { Heading, Root } from "mdast";

import { parseFrontmatter } from "@/lib/frontmatter.ts";

export interface AstTreeNode {
    id: string;
    text: string;
    depth: number;
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/[\s-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function collectText(node: unknown): string {
    if (node == null) return "";
    if (typeof node === "object" && "children" in (node as { children?: unknown[] }) && Array.isArray((node as { children: unknown[] }).children)) {
        return (node as { children: unknown[] }).children.map(collectText).join("");
    }
    if (typeof node === "object" && "value" in (node as { value?: unknown }) && typeof (node as { value: unknown }).value === "string") {
        return (node as { value: string }).value;
    }
    return "";
}

export function buildAstTree(content: string): AstTreeNode[] {
    const { body } = parseFrontmatter(content);
    const tree: Root = fromMarkdown(body);
    const nodes: AstTreeNode[] = [];
    const seen = new Set<string>();

    const pushNode = (heading: Heading) => {
        const text = collectText(heading);
        if (!text.trim()) return;
        let id = slugify(text);
        if (seen.has(id)) {
            let n = 2;
            while (seen.has(`${id}-${n}`)) n++;
            id = `${id}-${n}`;
        }
        seen.add(id);
        nodes.push({ id, text: text.trim(), depth: heading.depth });
    };

    for (const node of tree.children) {
        if (node.type === "heading") {
            pushNode(node as Heading);
        }
    }

    return nodes;
}
