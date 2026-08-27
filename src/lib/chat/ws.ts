import { getToken } from "@/lib/api";
import { getChatWsUrl } from "./api";
import type { ServerFrame, ClientFrame, EnvelopeFields } from "@/types/chat";

type WsCallbacks = {
    onHello: (userId: number) => void;
    onDmRecv: (mid: number, from: number, env: EnvelopeFields) => void;
    onDmRead: (by: number, conv: string) => void;
    onAck: (ref: string, ok: boolean, error?: string) => void;
    onError: (code: string, message: string) => void;
    onDisconnect: () => void;
};

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let callbacks: WsCallbacks | null = null;
let intentionalClose = false;

function handleFrame(raw: string) {
    let frame: ServerFrame;
    try {
        frame = JSON.parse(raw);
    } catch {
        return;
    }
    if (!callbacks) return;

    switch (frame.t) {
        case "hello":
            reconnectDelay = 1000;
            callbacks.onHello(frame.user_id);
            break;
        case "dm.recv":
            callbacks.onDmRecv(frame.mid, frame.from, frame.env);
            break;
        case "dm.read":
            callbacks.onDmRead(frame.by, frame.conv);
            break;
        case "ack":
            callbacks.onAck(frame.ref, frame.ok, frame.error);
            break;
        case "error":
            callbacks.onError(frame.code, frame.message);
            break;
    }
}

function scheduleReconnect() {
    if (intentionalClose) return;
    reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        connect(callbacks!);
    }, reconnectDelay);
}

export function connect(cbs: WsCallbacks): void {
    callbacks = cbs;
    intentionalClose = false;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const token = getToken();
    if (!token) return;

    ws = new WebSocket(getChatWsUrl(token));

    ws.onmessage = (e) => {
        if (typeof e.data === "string") handleFrame(e.data);
    };

    ws.onclose = () => {
        callbacks?.onDisconnect();
        scheduleReconnect();
    };

    ws.onerror = () => {
        ws?.close();
    };
}

export function disconnect(): void {
    intentionalClose = true;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
}

export function sendFrame(frame: ClientFrame): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(frame));
    }
}

export function isConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN;
}
