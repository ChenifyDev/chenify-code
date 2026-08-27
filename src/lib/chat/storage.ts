import { bytesToB64, b64ToBytes, generateKeyPair } from "./crypto";

function keyPath(userId: number, suffix: string): string {
    return `chenify_chat_${suffix}_${userId}`;
}

export interface StoredKeys {
    edPriv: Uint8Array;
    edPub: Uint8Array;
    xPriv: Uint8Array;
    xPub: Uint8Array;
}

export function loadKeys(userId: number): StoredKeys | null {
    const edPrivB64 = localStorage.getItem(keyPath(userId, "ed_priv"));
    const edPubB64 = localStorage.getItem(keyPath(userId, "ed_pub"));
    const xPrivB64 = localStorage.getItem(keyPath(userId, "x_priv"));
    const xPubB64 = localStorage.getItem(keyPath(userId, "x_pub"));
    if (!edPrivB64 || !edPubB64 || !xPrivB64 || !xPubB64) return null;
    return {
        edPriv: b64ToBytes(edPrivB64),
        edPub: b64ToBytes(edPubB64),
        xPriv: b64ToBytes(xPrivB64),
        xPub: b64ToBytes(xPubB64),
    };
}

export function saveKeys(userId: number, keys: StoredKeys): void {
    localStorage.setItem(keyPath(userId, "ed_priv"), bytesToB64(keys.edPriv));
    localStorage.setItem(keyPath(userId, "ed_pub"), bytesToB64(keys.edPub));
    localStorage.setItem(keyPath(userId, "x_priv"), bytesToB64(keys.xPriv));
    localStorage.setItem(keyPath(userId, "x_pub"), bytesToB64(keys.xPub));
}

export function generateAndSaveKeys(userId: number): StoredKeys {
    const { edPriv, edPub, xPriv, xPub } = generateKeyPair();
    const keys = { edPriv, edPub, xPriv, xPub };
    saveKeys(userId, keys);
    return keys;
}

export function getOrCreateKeys(userId: number): StoredKeys {
    return loadKeys(userId) ?? generateAndSaveKeys(userId);
}

export function clearKeys(userId: number): void {
    localStorage.removeItem(keyPath(userId, "ed_priv"));
    localStorage.removeItem(keyPath(userId, "ed_pub"));
    localStorage.removeItem(keyPath(userId, "x_priv"));
    localStorage.removeItem(keyPath(userId, "x_pub"));
}
