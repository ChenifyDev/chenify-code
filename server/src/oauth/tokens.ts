import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { createHash, randomBytes } from "node:crypto";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "chenify-dev-secret");
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export interface AccessTokenPayload {
    sub: number;
    client_id: string;
    scope: string;
    token_type: "access_token";
}

export async function signAccessToken(
    userId: number,
    clientId: string,
    scope: string,
): Promise<string> {
    // sub stays numeric: consumed internally by getAuthUserId
    const payload = {
        sub: userId,
        client_id: clientId,
        scope,
        token_type: "access_token",
    } as unknown as JWTPayload;
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .sign(SECRET);
}

export async function verifyAccessToken(
    token: string,
): Promise<AccessTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        if (payload.token_type !== "access_token") return null;
        return payload as unknown as AccessTokenPayload;
    } catch {
        return null;
    }
}

// OIDC id_token; goth requires aud=client_id and iss matching the discovery issuer
export async function signIdToken(
    userId: number,
    clientId: string,
    issuer: string,
): Promise<string> {
    return new SignJWT({
        iss: issuer,
        sub: String(userId),
        aud: clientId,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .sign(SECRET);
}

export function generateRefreshToken(): string {
    return randomBytes(40).toString("hex");
}

export function hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry(): Date {
    const d = new Date();
    d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return d;
}

export function generateAuthorizationCode(): string {
    return randomBytes(32).toString("base64url");
}

export function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
    const hash = createHash("sha256").update(codeVerifier).digest("base64url");
    return hash === codeChallenge;
}
