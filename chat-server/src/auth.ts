import { jwtVerify } from "jose";
import env from "./env";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return payload as Record<string, unknown>;
    } catch {
        return null;
    }
}

export function extractBearer(req: Request): string | null {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    return auth.slice(7);
}

export async function getAuthUser(req: Request): Promise<{ id: number; username: string } | null> {
    const token = extractBearer(req) ?? new URL(req.url).searchParams.get("token");
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload || payload.sub == null) return null;
    return { id: Number(payload.sub), username: String(payload.username ?? "") };
}
