import { type UserPublic } from "./types";
import { authHeaders, authRequest, request } from "./http";

interface LoginResponse {
    token: string;
    user: UserPublic;
}

export function login(login: string, password: string): Promise<LoginResponse> {
    return authRequest<LoginResponse>("/passport/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
    });
}

export function logout(): Promise<{ success: boolean }> {
    return authRequest<{ success: boolean }>("/passport/logout", { method: "POST" });
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
    return request<UserPublic>("/passport/me", {
        headers: authHeaders(),
    });
}