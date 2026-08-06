export interface UserPublic {
    id: number;
    username: string;
    email: string;
    avatar: string | undefined;
    created_at: string;
}

interface LoginResponse {
    token: string;
    user: UserPublic;
}

const TOKEN_KEY = "chenify_token";

export function setToken(token: string, remember: boolean): void {
    const storage = remember ? localStorage : sessionStorage;
    if (!remember) localStorage.removeItem(TOKEN_KEY);
    storage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export function login(login: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>("/passport/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
    });
}

export function register(username: string, email: string, password: string, avatar?: File | null): Promise<UserPublic> {
    const form = new FormData();
    form.set("username", username);
    form.set("email", email);
    form.set("password", password);
    if (avatar) form.set("avatar", avatar);
    return request<UserPublic>("/passport/register", { method: "POST", body: form });
}

export function me(): Promise<UserPublic> {
    const token = getToken();
    return request<UserPublic>("/passport/me", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
    });
}
