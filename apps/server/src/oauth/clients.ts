import { getStorage } from "../storage";
import type { OAuthClient } from "./types";

export interface CreateClientInput {
    name: string;
    redirect_uris: string[];
    scopes?: string;
}

export async function createClient(input: CreateClientInput): Promise<OAuthClient> {
    const storage = getStorage();
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const secret = crypto.randomUUID().replace(/-/g, "");
    const row = {
        id,
        secret,
        name: input.name,
        redirect_uris: JSON.stringify(input.redirect_uris),
        scopes: input.scopes ?? "openid profile email",
        created_at: new Date().toISOString(),
    };
    await storage.store.append("oauth_clients", row);
    return { ...row, redirect_uris: input.redirect_uris };
}

export async function findClient(clientId: string): Promise<OAuthClient | null> {
    const storage = getStorage();
    const rows = await storage.store.read<any>("oauth_clients");
    const row = rows.find((r) => r.id === clientId);
    if (!row) return null;
    return {
        id: row.id,
        secret: row.secret,
        name: row.name,
        redirect_uris: JSON.parse(row.redirect_uris),
        scopes: row.scopes,
        created_at: row.created_at,
    };
}

export async function findClientBySecret(secret: string): Promise<OAuthClient | null> {
    const storage = getStorage();
    const rows = await storage.store.read<any>("oauth_clients");
    const row = rows.find((r) => r.secret === secret);
    if (!row) return null;
    return {
        id: row.id,
        secret: row.secret,
        name: row.name,
        redirect_uris: JSON.parse(row.redirect_uris),
        scopes: row.scopes,
        created_at: row.created_at,
    };
}

export async function listClients(): Promise<OAuthClient[]> {
    const storage = getStorage();
    const rows = await storage.store.read<any>("oauth_clients");
    return rows.map((row) => ({
        id: row.id,
        secret: row.secret,
        name: row.name,
        redirect_uris: JSON.parse(row.redirect_uris),
        scopes: row.scopes,
        created_at: row.created_at,
    }));
}

export async function deleteClient(clientId: string): Promise<boolean> {
    const storage = getStorage();
    await storage.store.deleteWhere<any>("oauth_clients", (row) => row.id === clientId);
    return true;
}
