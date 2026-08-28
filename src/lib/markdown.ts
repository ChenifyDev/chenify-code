import type { Nodes } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { length, slice } from "mdast-util-slice-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { math } from "micromark-extension-math";
import { mathFromMarkdown, mathToMarkdown } from "mdast-util-math";

export interface TruncateMarkdownResult {
    excerpt: string;
    isTruncated: boolean;
}

export function truncateMarkdown(content: string, maxLength: number): TruncateMarkdownResult {
    const tree = fromMarkdown(content, {
        extensions: [math()],
        mdastExtensions: [mathFromMarkdown()],
    });
    const totalLength = length(tree);
    if (totalLength <= maxLength) {
        return { excerpt: content, isTruncated: false };
    }

    const sliced = slice(tree, 0, maxLength);
    if (!sliced.node) {
        return { excerpt: content, isTruncated: false };
    }

    const excerpt = toMarkdown(sliced.node as Nodes, {
        extensions: [mathToMarkdown()],
    }).trimEnd();
    return { excerpt, isTruncated: true };
}
