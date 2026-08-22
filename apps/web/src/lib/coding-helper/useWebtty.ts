import { useCallback, useEffect, useRef, useState } from "react";

import { discoverPorts } from "./ports";
import { decodeS2C, encodeC2S, type S2CMessage } from "./protocol";

export type ConnStatus = "idle" | "discovering" | "connecting" | "connected" | "ended" | "error";

export interface UseWebttyOptions {
    onMessage: (msg: S2CMessage) => void;
}

export interface Webtty {
    status: ConnStatus;
    wsPort: number | null;
    httpPort: number | null;
    error: string | null;
    isConnected: boolean;
    connect: (port?: number) => Promise<void>;
    disconnect: () => void;
    send: (payload: unknown) => boolean;
}

export function useWebtty({ onMessage }: UseWebttyOptions): Webtty {
    const [status, setStatus] = useState<ConnStatus>("idle");
    const [wsPort, setWsPort] = useState<number | null>(null);
    const [httpPort, setHttpPort] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const closingRef = useRef(false);
    const onMessageRef = useRef(onMessage);

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const connect = useCallback((port?: number) => {
        return new Promise<void>((resolve, reject) => {
            const old = wsRef.current;
            if (old) {
                closingRef.current = true;
                old.close();
                wsRef.current = null;
            }
            closingRef.current = false;
            setError(null);

            const open = (target: number) => {
                setWsPort(target);
                setHttpPort(target - 1);
                setStatus("connecting");
                const ws = new WebSocket(`ws://127.0.0.1:${target}/`);
                ws.binaryType = "arraybuffer";
                wsRef.current = ws;

                ws.onopen = () => {
                    if (wsRef.current !== ws) return;
                    setStatus("connected");
                    resolve();
                };
                ws.onmessage = (ev) => {
                    const msg = decodeS2C(ev.data as ArrayBuffer);
                    onMessageRef.current(msg);
                };
                ws.onerror = () => {
                    setError("WebSocket 连接出错");
                    reject(new Error(`无法连接 ws://127.0.0.1:${target}/`));
                };
                ws.onclose = () => {
                    if (wsRef.current !== ws) return;
                    wsRef.current = null;
                    setStatus(closingRef.current ? "idle" : "ended");
                };
            };

            const resolveTarget = async () => {
                if (port != null) {
                    open(port);
                    return;
                }
                setStatus("discovering");
                const found = await discoverPorts();
                if (!found) {
                    setStatus("error");
                    setError("未发现 coding-helper 服务，请先启动后端或手动填写 WebSocket 端口");
                    reject(new Error("coding-helper 服务未发现"));
                    return;
                }
                open(found.wsPort);
            };

            void resolveTarget();
        });
    }, []);

    const disconnect = useCallback(() => {
        closingRef.current = true;
        const ws = wsRef.current;
        wsRef.current = null;
        if (ws) ws.close();
        setWsPort(null);
        setHttpPort(null);
        setStatus("idle");
    }, []);

    const send = useCallback((payload: unknown) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        ws.send(encodeC2S(payload));
        return true;
    }, []);

    return {
        status,
        wsPort,
        httpPort,
        error,
        isConnected: status === "connected",
        connect,
        disconnect,
        send,
    };
}
