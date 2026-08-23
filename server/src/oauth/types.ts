export interface OAuthClient {
    id: string;
    secret: string;
    name: string;
    redirect_uris: string[];
    scopes: string;
    created_at: string;
}

export interface OAuthAuthCode {
    id: number;
    code: string;
    user_id: number;
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    scope: string;
    expires_at: string;
    used: boolean;
}

export interface OAuthRefreshToken {
    id: number;
    token_hash: string;
    user_id: number;
    client_id: string;
    scope: string;
    expires_at: string;
    revoked: boolean;
}
