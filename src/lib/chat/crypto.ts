import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

const HKDF_INFO = new TextEncoder().encode("chenify-dm-session-v1");

const HEADER_PREFIX = new TextEncoder().encode("chenify-dm/v1:");

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const a of arrays) total += a.length;
    const result = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
        result.set(a, offset);
        offset += a.length;
    }
    return result;
}

function convKeyBytes(a: number, b: number): Uint8Array {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setUint32(0, lo);
    new DataView(buf.buffer).setUint32(4, hi);
    return buf;
}

export function buildCanonicalHeader(senderId: number, recipientId: number, ts: number, nonce: Uint8Array): Uint8Array {
    const senderBuf = new Uint8Array(4);
    new DataView(senderBuf.buffer).setUint32(0, senderId);
    const recipientBuf = new Uint8Array(4);
    new DataView(recipientBuf.buffer).setUint32(0, recipientId);
    const tsBuf = new Uint8Array(8);
    new DataView(tsBuf.buffer).setBigUint64(0, BigInt(ts));
    return concatBytes(HEADER_PREFIX, senderBuf, recipientBuf, tsBuf, nonce);
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

export function generateKeyPair() {
    const edPriv = ed25519.utils.randomSecretKey();
    const edPub = ed25519.getPublicKey(edPriv);
    const xPriv = x25519.utils.randomSecretKey();
    const xPub = x25519.getPublicKey(xPriv);
    return { edPriv, edPub, xPriv, xPub };
}

export function buildProofSig(userId: number, x25519Pub: Uint8Array, ed25519Priv: Uint8Array): Uint8Array {
    const prefix = new TextEncoder().encode("chenify-keys/v1:");
    const msg = new Uint8Array(prefix.length + 4 + 32);
    msg.set(prefix, 0);
    new DataView(msg.buffer, prefix.length).setUint32(0, userId);
    msg.set(x25519Pub, prefix.length + 4);
    return ed25519.sign(msg, ed25519Priv);
}

export function seal(
    plaintext: Uint8Array,
    sessionKey: Uint8Array,
    senderEdPriv: Uint8Array,
    senderId: number,
    recipientId: number,
    ts: number,
): { nonce: Uint8Array; ct: Uint8Array; sig: Uint8Array } {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const header = buildCanonicalHeader(senderId, recipientId, ts, nonce);
    const cipher = gcm(sessionKey, nonce, header);
    const ct = cipher.encrypt(plaintext);
    const sigPayload = new Uint8Array(header.length + ct.length);
    sigPayload.set(header, 0);
    sigPayload.set(ct, header.length);
    const sig = ed25519.sign(sigPayload, senderEdPriv);
    return { nonce, ct, sig };
}

export function open(
    envelope: { nonce: Uint8Array; ct: Uint8Array; sig: Uint8Array; header: Uint8Array },
    sessionKey: Uint8Array,
    senderEdPub: Uint8Array,
): Uint8Array | null {
    if (!ed25519.verify(envelope.sig, new Uint8Array([...envelope.header, ...envelope.ct]), senderEdPub)) {
        return null;
    }
    try {
        const cipher = gcm(sessionKey, envelope.nonce, envelope.header);
        return cipher.decrypt(envelope.ct);
    } catch {
        return null;
    }
}

export function bytesToB64(bytes: Uint8Array): string {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
}

export function b64ToBytes(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
