import { Database } from "bun:sqlite";

export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    avatar: string | null;
    created_at: string;
}

export interface UserPublic {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    created_at: string;
}

const db = new Database(import.meta.dir + "/../app.db");

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        avatar        TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

const insertUserStmt = db.prepare(
    `INSERT INTO users (username, email, password_hash, avatar)
     VALUES (?, ?, ?, ?)`,
);

const findByEmailStmt = db.prepare(
    `SELECT id, username, email, password_hash, avatar, created_at
     FROM users WHERE email = ?`,
);

const findByUsernameStmt = db.prepare(
    `SELECT id, username, email, password_hash, avatar, created_at
     FROM users WHERE username = ?`,
);

const findByIdStmt = db.prepare(
    `SELECT id, username, email, password_hash, avatar, created_at
     FROM users WHERE id = ?`,
);

export function createUser(username: string, email: string, passwordHash: string, avatar: string | null): UserPublic {
    const result = insertUserStmt.run(username, email, passwordHash, avatar);
    return {
        id: Number(result.lastInsertRowid),
        username,
        email,
        avatar,
        created_at: new Date().toISOString(),
    };
}

export function findUserByEmail(email: string): User | null {
    return findByEmailStmt.get(email) as User | null;
}

export function findUserByUsername(username: string): User | null {
    return findByUsernameStmt.get(username) as User | null;
}

export function findUserByUsernameOrEmail(login: string): unknown {
    return findByEmailStmt.get(login) ?? (findByUsernameStmt.get(login) as User | null);
}

export function findUserById(id: number): UserPublic | null {
    const row = findByIdStmt.get(id) as User | null;
    if (!row) return null;
    const { password_hash: _passwordHash, ...user } = row;
    return user;
}

export function toPublicUser(user: User): UserPublic {
    const { password_hash: _passwordHash, ...publicUser } = user;
    return publicUser;
}
