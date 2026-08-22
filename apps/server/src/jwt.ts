import type { webcrypto } from "node:crypto";

const encoder = new TextEncoder();

function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Uint8Array<ArrayBuffer> {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

const SECRET = process.env.JWT_SECRET ?? "chenify-dev-secret";
const ALGORITHM = "HS256";

let cachedKey: webcrypto.CryptoKey | null = null;

async function getKey(): Promise<webcrypto.CryptoKey> {
    if (!cachedKey) {
        cachedKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(SECRET),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign", "verify"],
        );
    }
    return cachedKey;
}

export interface JwtPayload {
    sub: number;
    username: string;
    email: string;
    iat: number;
    exp: number;
}

export async function signToken(
    payload: { sub: number; username: string; email: string },
    expiresInSeconds = 60 * 60 * 24 * 7,
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = base64urlEncode(encoder.encode(JSON.stringify({ alg: ALGORITHM, typ: "JWT" })));
    const body = base64urlEncode(encoder.encode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds })));
    const signingInput = `${header}.${body}`;
    const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(signingInput));
    return `${signingInput}.${base64urlEncode(signature)}`;
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const [header, body, signature] = parts;
        const signingInput = `${header}.${body}`;
        const valid = await crypto.subtle.verify(
            "HMAC",
            await getKey(),
            base64urlDecode(signature!),
            encoder.encode(signingInput),
        );
        if (!valid) return null;
        const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body!))) as JwtPayload;
        if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}
