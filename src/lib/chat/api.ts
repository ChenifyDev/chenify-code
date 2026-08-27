import { getToken } from "@/lib/api";
import type { Conversation, EnvelopeFields } from "@/types/chat";
import { bytesToB64 } from "./crypto";

const CHAT_BASE = "/chat-api";

async function chatFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = getToken();
    const res = await fetch(`${CHAT_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init?.headers,
        },
    });
    const data = (await res.json().catch(() => null)) as T & { message?: string } | null;
    if (!res.ok) throw new Error((data as any)?.message ?? `请求失败（${res.status}）`);
    return data as T;
}

export async function registerKeys(
    edPub: Uint8Array,
    xPub: Uint8Array,
    proofSig: Uint8Array,
): Promise<{ ok: boolean }> {
    return chatFetch("/keys", {
        method: "POST",
        body: JSON.stringify({
            ed25519_pub: bytesToB64(edPub),
            x25519_pub: bytesToB64(xPub),
            proof_sig: bytesToB64(proofSig),
        }),
    });
}

export async function getPeerKeys(userId: number): Promise<{
    user_id: number;
    ed25519_pub: string;
    x25519_pub: string;
    updated_at: string;
    online: boolean;
}> {
    return chatFetch(`/keys/${userId}`);
}

export async function getConversations(): Promise<{
    conversations: Conversation[];
}> {
    return chatFetch("/conversations");
}

export async function getHistory(
    peerId: number,
    cursor?: string,
    limit = 30,
): Promise<{
    messages: {
        id: number;
        sender_id: number;
        recipient_id: number;
        msg_id: string;
        env: EnvelopeFields;
        created_at: string;
        delivered_at: string | null;
        read_at: string | null;
    }[];
    next_cursor: string | null;
}> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return chatFetch(`/convs/${peerId}/messages?${params}`);
}

export function getChatWsUrl(token: string): string {
    const base = (import.meta.env.VITE_CHAT_PATH as string) || "http://localhost:8081";
    const url = new URL("/ws", base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("token", token);
    return url.toString();
}
