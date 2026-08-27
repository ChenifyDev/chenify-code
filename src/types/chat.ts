export type EnvelopeFields = {
    v: number;
    nonce: string;
    ct: string;
    sig: string;
    ts: number;
};

export type ChatMessage = {
    id: number;
    sender_id: number;
    recipient_id: number;
    msg_id: string;
    env: EnvelopeFields;
    plaintext?: string;
    created_at: string;
    delivered_at: string | null;
    read_at: string | null;
};

export type Conversation = {
    peer_id: number;
    last_time: string;
    unread_count: number;
    peer_name?: string;
    peer_avatar?: string;
    last_plaintext?: string;
};

export type ServerFrame =
    | { t: "hello"; user_id: number }
    | { t: "ack"; ref: string; ok: boolean; error?: string }
    | { t: "dm.recv"; mid: number; from: number; env: EnvelopeFields }
    | { t: "dm.read"; by: number; conv: string }
    | { t: "error"; code: string; message: string };

export type ClientFrame =
    | { t: "dm.send"; id: string; to: number; env: EnvelopeFields }
    | { t: "dm.delivered"; ids: number[] }
    | { t: "dm.read"; conv: string };
