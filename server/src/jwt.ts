import { SignJWT, jwtVerify } from "jose";

if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET is not set. Using default secret for development.");
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "chenify-dev-secret");
const EXPIRES_DAYS = Number(process.env.JWT_EXPIRES_DAYS ?? 7);

export async function signToken(payload: Record<string, unknown>): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${EXPIRES_DAYS}d`)
        .sign(SECRET);
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return payload as Record<string, unknown>;
    } catch {
        return null;
    }
}
