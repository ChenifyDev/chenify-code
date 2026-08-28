const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function stripLeadingNewline(text: string): string {
    return text.replace(/^\s*\r?\n/, "");
}

export function getCommentArea(content: string): boolean {
    const match = FRONTMATTER_RE.exec(content);
    if (!match) return true;
    const raw = (match[1] ?? "").match(/^commentArea:\s*(.+)$/m)?.[1];
    if (!raw) return true;
    const value = raw.trim();
    const quoted =
        (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
            ? value.slice(1, -1)
            : value;
    return quoted.trim().toLowerCase() !== "false";
}

export function setCommentArea(content: string, open: boolean): string {
    const match = FRONTMATTER_RE.exec(content);
    if (!match) {
        if (open) return content;
        return `---\ncommentArea: false\n---\n\n${stripLeadingNewline(content)}`;
    }

    const otherFields = (match[1] ?? "")
        .replace(/^commentArea:\s*.*$/gm, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");

    const body = content.slice(match[0].length).replace(/^\s*\r?\n/, "");

    if (open && !otherFields) return body;
    if (open) return `---\n${otherFields}\n---\n\n${body}`;

    const header = otherFields ? `${otherFields}\ncommentArea: false` : `commentArea: false`;
    return `---\n${header}\n---\n\n${body}`;
}