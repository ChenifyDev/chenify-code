import { getStorage } from "../storage";
import { extractBearer, extractAuthToken } from "../routes/util";
import { verifyToken } from "../jwt";
import { findClient, createClient, listClients, deleteClient } from "./clients";
import {
    signAccessToken,
    verifyAccessToken,
    signIdToken,
    generateRefreshToken,
    hashRefreshToken,
    getRefreshTokenExpiry,
    generateAuthorizationCode,
    verifyPKCE,
} from "./tokens";
import type { RouteMap } from "../utils/shared";

const jsonError = (status: number, message: string) => Response.json({ error: message }, { status });

async function getAuthUserId(req: Request): Promise<number | null> {
    const token = extractAuthToken(req);
    if (!token) return null;
    // Accept both OAuth access tokens and regular login tokens
    const oauthPayload = await verifyAccessToken(token);
    if (oauthPayload?.sub) return oauthPayload.sub;
    // Fallback: try regular login token verification (also covers session cookie)
    const payload = await verifyToken(token);
    return (payload?.sub as number) ?? null;
}

function parseFormUrlEncoded(body: string): Record<string, string> {
    const params: Record<string, string> = {};
    for (const pair of body.split("&")) {
        const [key, ...rest] = pair.split("=");
        if (key) params[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
    }
    return params;
}

// Issuer must stay identical between discovery and issued tokens
function getIssuer(req: Request): string {
    const configured = process.env.OAUTH_ISSUER;
    if (configured) return configured.replace(/\/+$/, "");
    const url = new URL(req.url);
    return `${url.protocol}//${url.host}`;
}

// x/oauth2 (used by Gitea/goth) sends client credentials via HTTP Basic by default
function extractBasicAuth(req: Request): { client_id: string; client_secret: string } | null {
    const header = req.headers.get("authorization");
    if (!header?.startsWith("Basic ")) return null;
    try {
        const decoded = atob(header.slice(6));
        const sep = decoded.indexOf(":");
        if (sep < 0) return null;
        return {
            client_id: decodeURIComponent(decoded.slice(0, sep)),
            client_secret: decodeURIComponent(decoded.slice(sep + 1)),
        };
    } catch {
        return null;
    }
}

// GET /.well-known/openid-configuration
async function handleDiscovery(req: Request): Promise<Response> {
    const base = getIssuer(req);
    return Response.json({
        issuer: base,
        authorization_endpoint: `${base}/oauth/authorize`,
        token_endpoint: `${base}/oauth/token`,
        userinfo_endpoint: `${base}/oauth/userinfo`,
        revocation_endpoint: `${base}/oauth/revoke`,
        scopes_supported: ["openid", "profile", "email"],
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["HS256"],
        token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
        claims_supported: ["sub", "name", "preferred_username", "email", "email_verified", "picture", "updated_at"],
    });
}

// GET /oauth/authorize
async function handleAuthorize(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const responseType = url.searchParams.get("response_type");
    const clientId = url.searchParams.get("client_id");
    const redirectUri = url.searchParams.get("redirect_uri");
    const scope = url.searchParams.get("scope") ?? "openid profile email";
    const codeChallenge = url.searchParams.get("code_challenge");
    const codeChallengeMethod = url.searchParams.get("code_challenge_method");
    const state = url.searchParams.get("state");

    if (responseType !== "code") return jsonError(400, "unsupported_response_type");
    if (!clientId) return jsonError(400, "invalid_request: missing client_id");
    if (!codeChallenge) {
        // Confidential clients (e.g. Gitea/goth) authenticate by secret at the token endpoint instead of PKCE
        console.warn("authorize without code_challenge: client must use confidential authentication");
    } else if (codeChallengeMethod !== "S256") {
        return jsonError(400, "invalid_request: code_challenge_method must be S256");
    }

    const client = await findClient(clientId);
    if (!client) return jsonError(400, "invalid_client");

    if (!redirectUri || !client.redirect_uris.includes(redirectUri)) {
        return jsonError(400, "invalid_request: redirect_uri mismatch");
    }

    const userId = await getAuthUserId(req);
    if (!userId) {
        const loginBase = process.env.OAUTH_LOGIN_URL ?? "/login";
        const returnTo = encodeURIComponent(req.url);
        const separator = loginBase.includes("?") ? "&" : "?";
        const loginUrl = `${loginBase}${separator}return_to=${returnTo}`;
        return Response.redirect(loginUrl, 302);
    }

    const code = generateAuthorizationCode();
    const storage = getStorage();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await storage.store.insert<any>("oauth_auth_codes", {
        code,
        user_id: userId,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge ?? "",
        scope,
        expires_at: expiresAt,
        used: false,
    });

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);

    return Response.redirect(redirectUrl.toString(), 302);
}

// POST /oauth/token
async function handleToken(req: Request): Promise<Response> {
    const contentType = req.headers.get("content-type") ?? "";
    let params: Record<string, string>;

    if (contentType.includes("application/json")) {
        params = (await req.json()) as Record<string, string>;
    } else {
        const body = await req.text();
        params = parseFormUrlEncoded(body);
    }
    const basic = extractBasicAuth(req);
    if (basic && !params.client_id) {
        params.client_id = basic.client_id;
        if (!params.client_secret) params.client_secret = basic.client_secret;
    }

    const grantType = params.grant_type;
    if (grantType === "authorization_code") {
        return handleAuthorizationCodeGrant(req, params);
    } else if (grantType === "refresh_token") {
        return handleRefreshTokenGrant(req, params);
    } else {
        return jsonError(400, "unsupported_grant_type");
    }
}

async function handleAuthorizationCodeGrant(req: Request, params: Record<string, string>): Promise<Response> {
    const { code, redirect_uri, client_id, client_secret, code_verifier } = params;

    if (!code) return jsonError(400, "invalid_request: missing code");

    const storage = getStorage();
    const rows = await storage.store.read<any>("oauth_auth_codes");
    const authCode = rows.find((r) => r.code === code);

    if (!authCode) return jsonError(400, "invalid_grant: code not found");
    if (authCode.used) return jsonError(400, "invalid_grant: code already used");
    if (new Date(authCode.expires_at) < new Date()) {
        return jsonError(400, "invalid_grant: code expired");
    }
    if (authCode.redirect_uri !== redirect_uri) {
        return jsonError(400, "invalid_grant: redirect_uri mismatch");
    }

    const client = await findClient(authCode.client_id);
    if (!client) return jsonError(400, "invalid_client");

    if (client_id && client_id !== client.id) {
        return jsonError(400, "invalid_grant: client_id mismatch");
    }
    if (client_secret && client.secret !== client_secret) {
        return jsonError(400, "invalid_grant: client_secret mismatch");
    }

    if (authCode.code_challenge) {
        // Public client flow: PKCE is mandatory
        if (!code_verifier) return jsonError(400, "invalid_request: missing code_verifier");
        if (!verifyPKCE(code_verifier, authCode.code_challenge)) {
            return jsonError(400, "invalid_grant: PKCE verification failed");
        }
    } else if (!client_secret || client.secret !== client_secret) {
        // Confidential client flow without PKCE requires the secret
        return jsonError(401, "invalid_client");
    }

    // Mark code as used
    await storage.store.updateById<any>("oauth_auth_codes", authCode.id, { used: true });

    // Issue tokens
    const accessToken = await signAccessToken(authCode.user_id, client.id, authCode.scope);
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiry().toISOString();

    await storage.store.insert<any>("oauth_refresh_tokens", {
        token_hash: tokenHash,
        user_id: authCode.user_id,
        client_id: client.id,
        scope: authCode.scope,
        expires_at: expiresAt,
        revoked: false,
    });

    const extra: Record<string, string> = {};
    if (authCode.scope.split(" ").includes("openid")) {
        extra.id_token = await signIdToken(authCode.user_id, client.id, getIssuer(req));
    }

    return Response.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: refreshToken,
        scope: authCode.scope,
        ...extra,
    });
}

async function handleRefreshTokenGrant(req: Request, params: Record<string, string>): Promise<Response> {
    const { refresh_token, client_id, client_secret, scope } = params;

    if (!refresh_token) return jsonError(400, "invalid_request: missing refresh_token");

    const storage = getStorage();
    const tokenHash = hashRefreshToken(refresh_token);
    const rows = await storage.store.read<any>("oauth_refresh_tokens");
    const stored = rows.find((r) => r.token_hash === tokenHash);

    if (!stored) return jsonError(400, "invalid_grant: refresh_token not found");
    if (stored.revoked) return jsonError(400, "invalid_grant: refresh_token revoked");
    if (new Date(stored.expires_at) < new Date()) {
        return jsonError(400, "invalid_grant: refresh_token expired");
    }

    const client = await findClient(stored.client_id);
    if (!client) return jsonError(400, "invalid_client");

    if (client_id && client_id !== client.id) {
        return jsonError(400, "invalid_grant: client_id mismatch");
    }
    if (client_secret && client.secret !== client_secret) {
        return jsonError(400, "invalid_grant: client_secret mismatch");
    }

    // Revoke old refresh token (rotation)
    await storage.store.updateById<any>("oauth_refresh_tokens", stored.id, { revoked: true });

    // Issue new tokens
    const newScope = scope || stored.scope;
    const accessToken = await signAccessToken(stored.user_id, client.id, newScope);
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRefreshToken);
    const expiresAt = getRefreshTokenExpiry().toISOString();

    await storage.store.insert<any>("oauth_refresh_tokens", {
        token_hash: newTokenHash,
        user_id: stored.user_id,
        client_id: client.id,
        scope: newScope,
        expires_at: expiresAt,
        revoked: false,
    });

    const extra: Record<string, string> = {};
    if (newScope.split(" ").includes("openid")) {
        extra.id_token = await signIdToken(stored.user_id, client.id, getIssuer(req));
    }

    return Response.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: newRefreshToken,
        scope: newScope,
        ...extra,
    });
}

// POST /oauth/revoke
async function handleRevoke(req: Request): Promise<Response> {
    const body = await req.text();
    const params = parseFormUrlEncoded(body);
    const { token, token_type_hint } = params;

    if (!token) return jsonError(400, "invalid_request: missing token");

    const storage = getStorage();

    if (token_type_hint === "refresh_token" || !token_type_hint) {
        const tokenHash = hashRefreshToken(token);
        const rows = await storage.store.read<any>("oauth_refresh_tokens");
        const stored = rows.find((r) => r.token_hash === tokenHash);
        if (stored) {
            await storage.store.updateById<any>("oauth_refresh_tokens", stored.id, { revoked: true });
        }
    }

    return new Response(null, { status: 200 });
}

// GET /oauth/userinfo
async function handleUserInfo(req: Request): Promise<Response> {
    const userId = await getAuthUserId(req);
    if (!userId) return jsonError(401, "invalid_token");

    const storage = getStorage();
    const user = await storage.users.findUserById(userId);
    if (!user) return jsonError(401, "invalid_token");

    const token = extractBearer(req)!;
    const oauthPayload = await verifyAccessToken(token);
    const scopes = oauthPayload?.scope?.split(" ") ?? ["openid", "profile", "email"];

    const info: Record<string, unknown> = { sub: String(user.id) };
    if (scopes.includes("profile")) {
        info.name = user.username;
        info.preferred_username = user.username;
        info.picture = user.avatar;
        info.updated_at = Math.floor(new Date(user.created_at).getTime() / 1000);
    }
    if (scopes.includes("email")) {
        info.email = user.email;
        info.email_verified = true;
    }

    return Response.json(info);
}

// POST /oauth/clients
async function handleCreateClient(req: Request): Promise<Response> {
    const body = (await req.json().catch(() => null)) as {
        name?: string;
        redirect_uris?: string[];
        scopes?: string;
    } | null;

    if (!body?.name || !body?.redirect_uris?.length) {
        return jsonError(400, "name and redirect_uris are required");
    }

    const client = await createClient({
        name: body.name,
        redirect_uris: body.redirect_uris,
        scopes: body.scopes,
    });

    return Response.json(client, { status: 201 });
}

// GET /oauth/clients
async function handleListClients(_req: Request): Promise<Response> {
    const clients = await listClients();
    return Response.json(clients);
}

// DELETE /oauth/clients/:id
async function handleDeleteClient(req: Request): Promise<Response> {
    const clientId = (req as any).params?.id;
    if (!clientId) return jsonError(400, "missing client id");
    await deleteClient(clientId);
    return new Response(null, { status: 204 });
}

export const routes: RouteMap = {
    "/.well-known/openid-configuration": { GET: handleDiscovery },
    "/oauth/authorize": { GET: handleAuthorize },
    "/oauth/token": { POST: handleToken },
    "/oauth/revoke": { POST: handleRevoke },
    "/oauth/userinfo": { GET: handleUserInfo },
    "/oauth/clients": { GET: handleListClients, POST: handleCreateClient },
    "/oauth/clients/:id": { DELETE: handleDeleteClient },
};
