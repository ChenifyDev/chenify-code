import { ed25519 } from "@noble/curves/ed25519.js";
import { gcm } from "@noble/ciphers/aes.js";
import { buildCanonicalHeader } from "./canonical";

const NONCE_LEN = 12;

export type EncryptedEnvelope = {
    nonce: Uint8Array;
    ct: Uint8Array;
    sig: Uint8Array;
    header: Uint8Array;
};

export function seal(
    plaintext: Uint8Array,
    sessionKey: Uint8Array,
    senderPrivateKey: Uint8Array,
    senderId: number,
    recipientId: number,
    ts: number,
): EncryptedEnvelope {
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN));
    const header = buildCanonicalHeader(senderId, recipientId, ts, nonce);
    const cipher = gcm(sessionKey, nonce, header);
    const ct = cipher.encrypt(plaintext);
    const sigPayload = new Uint8Array(header.length + ct.length);
    sigPayload.set(header, 0);
    sigPayload.set(ct, header.length);
    const sig = ed25519.sign(sigPayload, senderPrivateKey);
    return { nonce, ct, sig, header };
}

export function open(
    envelope: { nonce: Uint8Array; ct: Uint8Array; sig: Uint8Array; header: Uint8Array },
    sessionKey: Uint8Array,
    senderPublicKey: Uint8Array,
): Uint8Array | null {
    if (!ed25519.verify(envelope.sig, new Uint8Array([...envelope.header, ...envelope.ct]), senderPublicKey)) {
        return null;
    }
    try {
        const cipher = gcm(sessionKey, envelope.nonce, envelope.header);
        return cipher.decrypt(envelope.ct);
    } catch {
        return null;
    }
}
