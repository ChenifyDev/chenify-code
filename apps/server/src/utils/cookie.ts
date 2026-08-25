const SESSION_COOKIE_NAME = "chenify_session";
const EXPIRES_DAYS = Number(process.env.JWT_EXPIRES_DAYS ?? 7);

export function parseCookieHeader(header: string | null): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!header) return cookies;
    for (const part of header.split(";")) {
        const [key, ...rest] = part.trim().split("=");
        if (!key) continue;
        cookies[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
    }
    return cookies;
}

export function getSessionTokenFromRequest(req: Request): string | null {
    const cookies = parseCookieHeader(req.headers.get("cookie"));
    return cookies[SESSION_COOKIE_NAME] ?? null;
}

export function serializeSessionCookie(token: string, req: Request): string {
    const url = new URL(req.url);
    const maxAge = EXPIRES_DAYS * 24 * 60 * 60;
    const secure = url.protocol === "https:";
    const parts = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        "HttpOnly",
        "Path=/",
        `Max-Age=${maxAge}`,
        "SameSite=Lax",
    ];
    if (secure) parts.push("Secure");
    return parts.join("; ");
}

export function serializeClearSessionCookie(): string {
    return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
