import { create } from "zustand";
import type { ChatMessage, Conversation } from "@/types/chat";
import { getOrCreateKeys, type StoredKeys } from "@/lib/chat/storage";
import {
    deriveSessionKey,
    seal,
    open,
    b64ToBytes,
    bytesToB64,
    buildProofSig,
    buildCanonicalHeader,
} from "@/lib/chat/crypto";
import {
    registerKeys,
    getPeerKeys,
    getConversations,
    getHistory,
} from "@/lib/chat/api";
import * as ws from "@/lib/chat/ws";
import { getSpace } from "@/lib/api";

interface PeerCache {
    edPub: Uint8Array;
    xPub: Uint8Array;
    updated: number;
}

interface ChatState {
    connected: boolean;
    myUserId: number | null;
    myKeys: StoredKeys | null;
    peerKeysCache: Map<number, PeerCache>;
    peerKeysError: string | null;
    conversations: Conversation[];
    activePeerId: number | null;
    messages: Map<number, ChatMessage[]>;
    loadingHistory: boolean;
    hasMoreHistory: boolean;
    onlineUsers: Set<number>;
    pendingAcks: Map<string, (ok: boolean, error?: string) => void>;

    connect: () => void;
    disconnect: () => void;
    initKeys: (userId: number) => Promise<void>;
    openConversation: (peerId: number) => Promise<void>;
    loadHistory: (reset?: boolean) => Promise<void>;
    sendMessage: (text: string) => Promise<void>;
    markRead: (peerId: number) => void;
    loadConversations: () => Promise<void>;
    resolvePeerKeys: (userId: number) => Promise<PeerCache | null>;
}

function convKey(a: number, b: number): string {
    return `${Math.min(a, b)}_${Math.max(a, b)}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
    connected: false,
    myUserId: null,
    myKeys: null,
    peerKeysCache: new Map(),
    peerKeysError: null,
    conversations: [],
    activePeerId: null,
    messages: new Map(),
    loadingHistory: false,
    hasMoreHistory: false,
    onlineUsers: new Set(),
    pendingAcks: new Map(),

    async initKeys(userId: number) {
        const keys = getOrCreateKeys(userId);
        set({ myKeys: keys, myUserId: userId });

        try {
            await registerKeys(keys.edPub, keys.xPub, buildProofSig(userId, keys.xPub, keys.edPriv));
        } catch {
            // registration may fail if already registered; ignore
        }
    },

    async loadConversations() {
        try {
            const { conversations } = await getConversations();
            const enriched = await Promise.all(
                conversations.map(async (conv) => {
                    let peer_name: string | undefined;
                    let peer_avatar: string | undefined;
                    try {
                        const space = await getSpace(conv.peer_id);
                        peer_name = space.user.username;
                        peer_avatar = space.user.avatar;
                    } catch {
                        // ignore
                    }
                    return { ...conv, peer_name, peer_avatar };
                }),
            );
            set({ conversations: enriched });
        } catch {
            // ignore
        }
    },

    connect() {
        const { myUserId } = get();
        if (!myUserId) return;

        ws.connect({
            onHello: (userId) => {
                set({ connected: true, myUserId: userId });
                get().loadConversations();
            },
            onDmRecv: async (mid, from, env) => {
                const state = get();
                if (!state.myKeys) return;

                const peerKeys = await state.resolvePeerKeys(from);
                if (!peerKeys) return;

                const myXPriv = state.myKeys.xPriv;
                const sk = deriveSessionKey(myXPriv, peerKeys.xPub, Math.min(state.myUserId!, from), Math.max(state.myUserId!, from));

                const header = buildHeaderBytes(from, state.myUserId!, env.ts, b64ToBytes(env.nonce));
                const pt = open(
                    { nonce: b64ToBytes(env.nonce), ct: b64ToBytes(env.ct), sig: b64ToBytes(env.sig), header },
                    sk,
                    peerKeys.edPub,
                );

                const plaintext = pt ? new TextDecoder().decode(pt) : "【解密失败】";

                const msg: ChatMessage = {
                    id: mid,
                    sender_id: from,
                    recipient_id: state.myUserId!,
                    msg_id: "",
                    env,
                    plaintext,
                    created_at: new Date(env.ts).toISOString(),
                    delivered_at: null,
                    read_at: null,
                };

                const newMessages = new Map(state.messages);
                const peerMsgs = newMessages.get(from) ?? [];
                peerMsgs.unshift(msg);
                newMessages.set(from, peerMsgs);

                const newConvs = [...state.conversations];
                const convIdx = newConvs.findIndex((c) => c.peer_id === from);
                if (convIdx >= 0) {
                    newConvs[convIdx] = {
                        ...newConvs[convIdx],
                        last_time: msg.created_at,
                        last_plaintext: plaintext,
                        unread_count: state.activePeerId === from ? 0 : newConvs[convIdx]!.unread_count + 1,
                    };
                } else {
                    let peer_name: string | undefined;
                    let peer_avatar: string | undefined;
                    try {
                        const space = await getSpace(from);
                        peer_name = space.user.username;
                        peer_avatar = space.user.avatar;
                    } catch {
                        // ignore
                    }
                    newConvs.unshift({
                        peer_id: from,
                        last_time: msg.created_at,
                        unread_count: 1,
                        peer_name,
                        peer_avatar,
                        last_plaintext: plaintext,
                    });
                }
                newConvs.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());

                set({ messages: newMessages, conversations: newConvs });

                ws.sendFrame({ t: "dm.delivered", ids: [mid] });

                if (state.activePeerId === from) {
                    ws.sendFrame({ t: "dm.read", conv: convKey(state.myUserId!, from) });
                }
            },
            onDmRead: (by, _conv) => {
                const state = get();
                const peerMsgs = state.messages.get(by);
                if (!peerMsgs) return;
                const updated = peerMsgs.map((m) =>
                    m.sender_id === state.myUserId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m,
                );
                const newMessages = new Map(state.messages);
                newMessages.set(by, updated);
                set({ messages: newMessages });
            },
            onAck: (ref, ok, error) => {
                const { pendingAcks } = get();
                const cb = pendingAcks.get(ref);
                if (cb) {
                    cb(ok, error);
                    const newPending = new Map(pendingAcks);
                    newPending.delete(ref);
                    set({ pendingAcks: newPending });
                }
            },
            onError: (_code, _message) => {
                // toast could be shown here
            },
            onDisconnect: () => {
                set({ connected: false });
            },
        });
    },

    disconnect() {
        ws.disconnect();
        set({ connected: false });
    },

    async openConversation(peerId: number) {
        set({ activePeerId: peerId, loadingHistory: true, hasMoreHistory: false, peerKeysError: null });

        const state = get();
        const convIdx = state.conversations.findIndex((c) => c.peer_id === peerId);
        if (convIdx >= 0 && state.conversations[convIdx]!.unread_count > 0) {
            const newConvs = [...state.conversations];
            newConvs[convIdx] = { ...newConvs[convIdx]!, unread_count: 0 };
            set({ conversations: newConvs });
            ws.sendFrame({ t: "dm.read", conv: convKey(state.myUserId!, peerId) });
        }

        await get().loadHistory(true);
    },

    async loadHistory(reset = false) {
        const { activePeerId, messages, myUserId, myKeys } = get();
        if (!activePeerId || !myUserId || !myKeys) return;

        set({ loadingHistory: true });

        try {
            const peerKeys = await get().resolvePeerKeys(activePeerId);
            if (!peerKeys) {
                set({ loadingHistory: false });
                return;
            }

            const existingMsgs = reset ? [] : (messages.get(activePeerId) ?? []);
            const cursor = existingMsgs.length > 0 ? String(existingMsgs[existingMsgs.length - 1]!.id) : undefined;

            const { messages: serverMsgs, next_cursor } = await getHistory(activePeerId, cursor);

            const sk = deriveSessionKey(
                myKeys.xPriv,
                peerKeys.xPub,
                Math.min(myUserId, activePeerId),
                Math.max(myUserId, activePeerId),
            );

            const decrypted: ChatMessage[] = serverMsgs.map((m) => {
                const header = buildHeaderBytes(m.sender_id, m.recipient_id, m.env.ts, b64ToBytes(m.env.nonce));
                const senderEdPub = m.sender_id === myUserId ? myKeys.edPub : peerKeys.edPub;
                const pt = open(
                    { nonce: b64ToBytes(m.env.nonce), ct: b64ToBytes(m.env.ct), sig: b64ToBytes(m.env.sig), header },
                    sk,
                    senderEdPub,
                );
                return {
                    ...m,
                    plaintext: pt ? new TextDecoder().decode(pt) : "【解密失败】",
                };
            });

            const newMessages = new Map(messages);
            if (reset) {
                newMessages.set(activePeerId, decrypted);
            } else {
                const prev = newMessages.get(activePeerId) ?? [];
                newMessages.set(activePeerId, [...prev, ...decrypted]);
            }

            set({
                messages: newMessages,
                loadingHistory: false,
                hasMoreHistory: next_cursor !== null,
            });
        } catch {
            set({ loadingHistory: false });
        }
    },

    async sendMessage(text: string) {
        const { myUserId, myKeys, activePeerId, peerKeysCache, pendingAcks } = get();
        if (!myUserId || !myKeys || !activePeerId) return;

        const peerCache = peerKeysCache.get(activePeerId);
        if (!peerCache) return;

        const msgId = crypto.randomUUID();
        const ts = Date.now();
        const plaintext = new TextEncoder().encode(text);

        const sk = deriveSessionKey(
            myKeys.xPriv,
            peerCache.xPub,
            Math.min(myUserId, activePeerId),
            Math.max(myUserId, activePeerId),
        );

        const env = seal(plaintext, sk, myKeys.edPriv, myUserId, activePeerId, ts);

        const optimisticMsg: ChatMessage = {
            id: Date.now(),
            sender_id: myUserId,
            recipient_id: activePeerId,
            msg_id: msgId,
            env: { v: 1, nonce: bytesToB64(env.nonce), ct: bytesToB64(env.ct), sig: bytesToB64(env.sig), ts },
            plaintext: text,
            created_at: new Date(ts).toISOString(),
            delivered_at: null,
            read_at: null,
        };

        const newMessages = new Map(get().messages);
        const peerMsgs = newMessages.get(activePeerId) ?? [];
        peerMsgs.unshift(optimisticMsg);
        newMessages.set(activePeerId, peerMsgs);

        const newConvs = [...get().conversations];
        const convIdx = newConvs.findIndex((c) => c.peer_id === activePeerId);
        if (convIdx >= 0) {
            newConvs[convIdx] = { ...newConvs[convIdx]!, last_time: optimisticMsg.created_at, last_plaintext: text };
        }
        newConvs.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());

        set({ messages: newMessages, conversations: newConvs });

        return new Promise<void>((resolve) => {
            const newPending = new Map(pendingAcks);
            newPending.set(msgId, (ok, error) => {
                if (!ok) {
                    // TODO: show error toast, remove optimistic message
                    console.error("send failed:", error);
                }
                resolve();
            });
            set({ pendingAcks: newPending });

            ws.sendFrame({
                t: "dm.send",
                id: msgId,
                to: activePeerId,
                env: {
                    v: 1,
                    nonce: bytesToB64(env.nonce),
                    ct: bytesToB64(env.ct),
                    sig: bytesToB64(env.sig),
                    ts,
                },
            });
        });
    },

    markRead(peerId: number) {
        const { myUserId } = get();
        if (!myUserId) return;
        ws.sendFrame({ t: "dm.read", conv: convKey(myUserId, peerId) });
    },

    async resolvePeerKeys(userId: number): Promise<PeerCache | null> {
        const { peerKeysCache, myKeys } = get();
        if (!myKeys) return null;

        const cached = peerKeysCache.get(userId);
        if (cached && Date.now() - cached.updated < 3600_000) return cached;

        try {
            const data = await getPeerKeys(userId);
            const cache: PeerCache = {
                edPub: b64ToBytes(data.ed25519_pub),
                xPub: b64ToBytes(data.x25519_pub),
                updated: Date.now(),
            };
            const newCache = new Map(peerKeysCache);
            newCache.set(userId, cache);
            set({ peerKeysCache: newCache, peerKeysError: null });
            return cache;
        } catch (e: any) {
            if (e?.message?.includes("404") || e?.message?.includes("keys not found")) {
                set({ peerKeysError: "对方尚未设置加密密钥" });
            }
            return null;
        }
    },
}));

function buildHeaderBytes(senderId: number, recipientId: number, ts: number, nonce: Uint8Array): Uint8Array {
    return buildCanonicalHeader(senderId, recipientId, ts, nonce);
}
