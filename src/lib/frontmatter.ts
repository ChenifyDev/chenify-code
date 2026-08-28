const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function quoteYaml(value: string): string {
    const collapsed = value.replace(/\s+/g, " ").trim();
    return `"${collapsed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function unquoteYaml(value: string): string {
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
        return value
            .slice(1, -1)
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
    }
    if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
        return value.slice(1, -1).replace(/'{2}/g, "'");
    }
    return value;
}

export interface Frontmatter {
    title?: string;
}

export function parseFrontmatter(content: string): Frontmatter & { body: string } {
    const match = FRONTMATTER_RE.exec(content);
    if (!match) return { body: content };

    const title = match[1].match(/^title:\s*(.+)$/m)?.[1];
    const body = content.slice(match[0].length).replace(/^\s*\r?\n/, "");

    return { title: title ? unquoteYaml(title.trim()) : undefined, body };
}

export function getTitle(content: string): string | undefined {
    return parseFrontmatter(content).title;
}

export function withTitle(title: string | undefined, body: string): string {
    const trimmed = title?.trim();
    const cleanBody = body.trim();
    if (!trimmed) return cleanBody;
    return `---\ntitle: ${quoteYaml(trimmed)}\n---\n\n${cleanBody}`;
}