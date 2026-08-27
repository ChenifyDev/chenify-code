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

export function buildCanonicalHeader(
    senderId: number,
    recipientId: number,
    ts: number,
    nonce: Uint8Array,
): Uint8Array {
    const senderBuf = new Uint8Array(4);
    new DataView(senderBuf.buffer).setUint32(0, senderId);
    const recipientBuf = new Uint8Array(4);
    new DataView(recipientBuf.buffer).setUint32(0, recipientId);
    const tsBuf = new Uint8Array(8);
    new DataView(tsBuf.buffer).setBigUint64(0, BigInt(ts));
    return concatBytes(HEADER_PREFIX, senderBuf, recipientBuf, tsBuf, nonce);
}
