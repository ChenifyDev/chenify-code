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