export type ServerFrame =
    | { t: "hello"; user_id: number }
    | { t: "ack"; ref: string; ok: boolean; error?: string }
    | { t: "dm.recv"; mid: number; from: number; env: EnvelopeFields }
    | { t: "error"; code: string; message: string };

export type ClientFrame =
    | { t: "dm.send"; id: string; to: number; env: EnvelopeFields }
    | { t: "dm.delivered"; ids: number[] }
    | { t: "dm.read"; conv: string };

export type EnvelopeFields = {
    v: number;
    nonce: string;
    ct: string;
    sig: string;
    ts: number;
};

export const MAX_ENVELOPE_SIZE = 64 * 1024;
export const MAX_MSG_PLAINTEXT = 16 * 1024;

export function isDmSend(f: unknown): f is ClientFrame & { t: "dm.send" } {
    if (typeof f !== "object" || f === null) return false;
    const o = f as Record<string, unknown>;
    if (o.t !== "dm.send") return false;
    if (typeof o.id !== "string" || typeof o.to !== "number") return false;
    const env = o.env as Record<string, unknown> | undefined;
    if (!env || typeof env !== "object") return false;
    return typeof env.nonce === "string" && typeof env.ct === "string" && typeof env.sig === "string" && typeof env.v === "number" && typeof env.ts === "number";
}

export function isDmDelivered(f: unknown): f is ClientFrame & { t: "dm.delivered" } {
    if (typeof f !== "object" || f === null) return false;
    const o = f as Record<string, unknown>;
    if (o.t !== "dm.delivered") return false;
    return Array.isArray(o.ids) && o.ids.every((x: unknown) => typeof x === "number");
}

export function isDmRead(f: unknown): f is ClientFrame & { t: "dm.read" } {
    if (typeof f !== "object" || f === null) return false;
    const o = f as Record<string, unknown>;
    return o.t === "dm.read" && typeof o.conv === "string";
}
