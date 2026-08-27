import { Database } from "bun:sqlite";
import env from "./env";

let accountDb: Database | null = null;

function getDb(): Database {
    if (!accountDb) {
        accountDb = new Database(env.ACCOUNT_DB_PATH, { readonly: true } as any);
    }
    return accountDb;
}

interface AccountRow {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
}

let stmt: ReturnType<Database["query"]> | null = null;

export function getUserById(id: number): AccountRow | null {
    if (!stmt) {
        stmt = getDb().query("SELECT id, username, email, avatar FROM users WHERE id = ?");
    }
    return stmt.get(id) as AccountRow | null;
}

export function userExists(id: number): boolean {
    return getUserById(id) !== null;
}
