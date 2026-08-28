import { getToken } from "./token";

export function getApiBase(): string {
    return (import.meta.env.VITE_API_PATH as string | undefined) ?? "";
}

export function authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    }
    const text = query.toString();
    return text ? `?${text}` : "";
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const isJson = typeof init?.body === "string";
    const res = await fetch(`/api${path}`, {
        ...init,
        headers: {
            ...(isJson ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
    });

    const data = (await res.json().catch(() => null)) as { message?: string } | null;

    if (!res.ok) {
        throw new Error(data?.message ?? `请求失败（${res.status}）`);
    }
    return data as T;
}

export async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const isJson = typeof init?.body === "string";
    const base = getApiBase();
    const res = await fetch(`${base}/api${path}`, {
        ...init,
        credentials: "include",
        headers: {
            ...(isJson ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
    });

    const data = (await res.json().catch(() => null)) as { message?: string } | null;

    if (!res.ok) {
        throw new Error(data?.message ?? `请求失败（${res.status}）`);
    }
    return data as T;
}