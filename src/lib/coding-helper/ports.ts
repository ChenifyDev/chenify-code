import { decode } from "@msgpack/msgpack";

import { PORT_PAIRS } from "./protocol";

export interface DiscoveredPorts {
    httpPort: number;
    wsPort: number;
}

async function pingHttp(port: number, timeoutMs = 1200): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`http://127.0.0.1:${port}/ping`, {
            signal: controller.signal,
            cache: "no-store",
        });
        if (!res.ok) return false;
        const body = (await decode(await res.arrayBuffer())) as {
            ok?: boolean;
            data?: { auto?: boolean };
        };
        return body?.data?.auto === true;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

export async function discoverPorts(): Promise<DiscoveredPorts | null> {
    for (const [httpPort, wsPort] of PORT_PAIRS) {
        if (await pingHttp(httpPort)) {
            return { httpPort, wsPort };
        }
    }
    return null;
}
