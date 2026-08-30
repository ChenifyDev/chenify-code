export const MAX_TAGS = 10;

export function splitTags(raw: string): string[] {
    return [
        ...new Set(
            raw
                .split(/[,，\s]+/)
                .map((tag) => tag.trim().toLowerCase())
                .filter(Boolean),
        ),
    ].slice(0, MAX_TAGS);
}