const TOKEN_KEY = "chenify_token";

/**
 * "记住我"双存储：remember 时存 localStorage（持久），否则存 sessionStorage（关标签页失效）。
 * 取 token 时优先 localStorage，实现 7 天内免登录。
 */
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