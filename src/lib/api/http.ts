import { getToken } from "./token";

/**
 * 请求层约定：
 * - request<T>()：走当前站点的 `/api`，认证靠 Bearer token（须由调用方手动
 *   在 headers 里展开 authHeaders()）。绝大多数业务接口走这条路。
 * - authRequest<T>()：登录/登出专用，走 `${VITE_API_PATH}/api` 并带 cookie 会话
 *   （credentials: "include"）。应用同时存在 token 与 cookie 两套认证方式。
 */
export function getApiBase(): string {
    return (import.meta.env.VITE_API_PATH as string | undefined) ?? "";
}

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

/** 未登录时返回空对象，避免在 headers 里放一个 "Bearer null"。 */
export function authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 拼查询串：过滤掉 undefined / null / 空串的键。 */
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
        throw new ApiError(data?.message ?? `请求失败（${res.status}）`, res.status);
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
        throw new ApiError(data?.message ?? `请求失败（${res.status}）`, res.status);
    }
    return data as T;
}
