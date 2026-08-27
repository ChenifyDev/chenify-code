import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

export const edRandomSecretKey = ed25519.utils.randomSecretKey;
export const edGetPublicKey = ed25519.getPublicKey;

export const x25RandomSecretKey = x25519.utils.randomSecretKey;
export const x25GetPublicKey = x25519.getPublicKey;

const HKDF_INFO = new TextEncoder().encode("chenify-dm-session-v1");

function convKeyBytes(a: number, b: number): Uint8Array {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setUint32(0, lo);
    new DataView(buf.buffer).setUint32(4, hi);
    return buf;
}

export function deriveSessionKey(
    myX25519PrivateKey: Uint8Array,
    peerX25519PublicKey: Uint8Array,
    userA: number,
    userB: number,
): Uint8Array {
    const shared = x25519.getSharedSecret(myX25519PrivateKey, peerX25519PublicKey);
    return hkdf(sha256, shared, convKeyBytes(userA, userB), HKDF_INFO, 32);
}
