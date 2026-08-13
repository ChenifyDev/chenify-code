import { findUserById, type UserPublic } from "../db";
import { verifyToken } from "../jwt";

export function jsonError(status: number, message: string): Response {
    return Response.json({ message }, { status });
}

export function extractBearer(req: Request): string | null {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    return auth.slice(7);
}

export async function getAuthUser(req: Request): Promise<UserPublic | null> {
    const token = extractBearer(req);
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload) return null;
    return findUserById(payload.sub);
}

export function parsePagination(url: URL, defaultLimit = 20, maxLimit = 50): { offset: number; limit: number } {
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
    const limit = Math.min(
        maxLimit,
        Math.max(1, Number(url.searchParams.get("limit") ?? defaultLimit) || defaultLimit),
    );
    return { offset, limit };
}
