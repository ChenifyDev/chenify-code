import { Database } from "bun:sqlite";

export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    avatar: string | null;
    created_at: string;
    is_favorites_public: number;
    is_follows_public: number;
}

export interface UserPublic {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    created_at: string;
}

export interface SpaceUser extends UserPublic {
    is_favorites_public: boolean;
    is_follows_public: boolean;
}

export interface UserSummary {
    id: number;
    username: string;
    avatar: string | null;
    created_at: string;
}

export interface FollowUser extends UserSummary {
    is_following: boolean;
}

export interface Post {
    id: number;
    content: string;
    created_at: string;
    author: UserSummary;
    images: string[];
    tags: string[];
    comments_count: number;
    likes_count: number;
    favorites_count: number;
    is_liked: boolean;
    is_favorited: boolean;
    is_following_author: boolean;
}

export interface Comment {
    id: number;
    post_id: number;
    content: string;
    created_at: string;
    author: UserSummary;
    post_snippet: string;
}

export interface SpaceCounts {
    posts: number;
    favorites: number | null;
    following: number | null;
    followers: number | null;
}

const db = new Database(import.meta.dir + "/../app.db");

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        username            TEXT NOT NULL UNIQUE,
        email               TEXT NOT NULL UNIQUE,
        password_hash       TEXT NOT NULL,
        avatar              TEXT,
        created_at          TEXT NOT NULL DEFAULT (datetime('now')),
        is_favorites_public INTEGER NOT NULL DEFAULT 1,
        is_follows_public   INTEGER NOT NULL DEFAULT 1
    )
`);

try {
    db.run(`ALTER TABLE users ADD COLUMN is_favorites_public INTEGER NOT NULL DEFAULT 1`);
} catch {}
try {
    db.run(`ALTER TABLE users ADD COLUMN is_follows_public INTEGER NOT NULL DEFAULT 1`);
} catch {}

db.run(`
    CREATE TABLE IF NOT EXISTS posts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        content    TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)`);

db.run(`
    CREATE TABLE IF NOT EXISTS post_images (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        path    TEXT NOT NULL
    )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id)`);

db.run(`
    CREATE TABLE IF NOT EXISTS tags (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_id  INTEGER NOT NULL REFERENCES tags(id),
        PRIMARY KEY (post_id, tag_id)
    )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id)`);

db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (user_id, post_id)
    )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_favorites_post_id ON favorites(post_id)`);

db.run(`
    CREATE TABLE IF NOT EXISTS likes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (user_id, post_id)
    )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)`);

db.run(`
    CREATE TABLE IF NOT EXISTS comments (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        content    TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)`);

db.run(`
    CREATE TABLE IF NOT EXISTS follows (
        follower_id  INTEGER NOT NULL REFERENCES users(id),
        following_id INTEGER NOT NULL REFERENCES users(id),
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (follower_id, following_id)
    )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`);

db.run("PRAGMA foreign_keys = ON");

const insertUserStmt = db.prepare(
    `INSERT INTO users (username, email, password_hash, avatar)
     VALUES (?, ?, ?, ?)`,
);

const findByEmailStmt = db.prepare(
    `SELECT id, username, email, password_hash, avatar, created_at,
            is_favorites_public, is_follows_public
     FROM users WHERE email = ?`,
);

const findByUsernameStmt = db.prepare(
    `SELECT id, username, email, password_hash, avatar, created_at,
            is_favorites_public, is_follows_public
     FROM users WHERE username = ?`,
);

const findByIdStmt = db.prepare(
    `SELECT id, username, email, password_hash, avatar, created_at
     FROM users WHERE id = ?`,
);

const getSpaceUserStmt = db.prepare(
    `SELECT id, username, email, avatar, created_at, is_favorites_public, is_follows_public
     FROM users WHERE id = ?`,
);

const userExistsStmt = db.prepare(`SELECT 1 FROM users WHERE id = ?`);

const insertPostStmt = db.prepare(`INSERT INTO posts (user_id, content) VALUES (?, ?)`);
const getPostStmt = db.prepare(`
    SELECT p.id, p.user_id, p.content, p.created_at,
           u.username, u.avatar,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
           (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) AS favorites_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
`);
const getPostOwnerStmt = db.prepare(`SELECT user_id FROM posts WHERE id = ?`);
const listPostsStmt = db.prepare(`
    SELECT p.id, p.user_id, p.content, p.created_at,
           u.username, u.avatar,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
           (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) AS favorites_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ? OFFSET ?
`);
const listPostsByTagStmt = db.prepare(`
    SELECT p.id, p.user_id, p.content, p.created_at,
           u.username, u.avatar,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
           (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) AS favorites_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.name = ?)
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ? OFFSET ?
`);
const listUserPostsStmt = db.prepare(`
    SELECT p.id, p.user_id, p.content, p.created_at,
           u.username, u.avatar,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
           (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) AS favorites_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ? OFFSET ?
`);
const listHotPostsStmt = db.prepare(`
    SELECT *, ((likes_count * 3 + favorites_count * 4 + comments_count * 2 + 1)
               / pow((julianday('now') - julianday(created_at)) * 24 + 2, 1.5)) AS heat
    FROM (
        SELECT p.id, p.user_id, p.content, p.created_at,
               u.username, u.avatar,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
               (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
               (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) AS favorites_count
        FROM posts p
        JOIN users u ON u.id = p.user_id
    )
    ORDER BY heat DESC, created_at DESC, id DESC
    LIMIT ? OFFSET ?
`);
const listHotPostsByTagStmt = db.prepare(`
    SELECT *, ((likes_count * 3 + favorites_count * 4 + comments_count * 2 + 1)
               / pow((julianday('now') - julianday(created_at)) * 24 + 2, 1.5)) AS heat
    FROM (
        SELECT p.id, p.user_id, p.content, p.created_at,
               u.username, u.avatar,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
               (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
               (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) AS favorites_count
        FROM posts p
        JOIN users u ON u.id = p.user_id
        WHERE p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.name = ?)
    )
    ORDER BY heat DESC, created_at DESC, id DESC
    LIMIT ? OFFSET ?
`);
const listUserFavoritesStmt = db.prepare(`
    SELECT p.id, p.user_id, p.content, p.created_at,
           u.username, u.avatar,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
           (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
           (SELECT COUNT(*) FROM favorites f WHERE f.post_id = p.id) AS favorites_count
    FROM favorites fav
    JOIN posts p ON p.id = fav.post_id
    JOIN users u ON u.id = p.user_id
    WHERE fav.user_id = ?
    ORDER BY fav.id DESC
    LIMIT ? OFFSET ?
`);

const insertPostImageStmt = db.prepare(`INSERT INTO post_images (post_id, path) VALUES (?, ?)`);
const getPostImagesStmt = db.prepare(`SELECT path FROM post_images WHERE post_id = ?`);

const insertTagStmt = db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`);
const getTagIdStmt = db.prepare(`SELECT id FROM tags WHERE name = ?`);
const listTagsStmt = db.prepare(`SELECT name
                                 FROM tags
                                 ORDER BY name `);
const insertPostTagStmt = db.prepare(`INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)`);

const deletePostImagesStmt = db.prepare(`DELETE FROM post_images WHERE post_id = ?`);
const deletePostTagsStmt = db.prepare(`DELETE FROM post_tags WHERE post_id = ?`);
const deletePostFavoritesStmt = db.prepare(`DELETE FROM favorites WHERE post_id = ?`);
const deletePostCommentsStmt = db.prepare(`DELETE FROM comments WHERE post_id = ?`);
const deletePostStmt = db.prepare(`DELETE FROM posts WHERE id = ?`);

const insertFavoriteStmt = db.prepare(`INSERT OR IGNORE INTO favorites (user_id, post_id) VALUES (?, ?)`);
const deleteFavoriteStmt = db.prepare(`DELETE FROM favorites WHERE user_id = ? AND post_id = ?`);
const getFavoriteStmt = db.prepare(`SELECT 1 FROM favorites WHERE user_id = ? AND post_id = ?`);
const countFavoritesStmt = db.prepare(`SELECT COUNT(*) AS n FROM favorites WHERE post_id = ?`);

const insertLikeStmt = db.prepare(`INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)`);
const deleteLikeStmt = db.prepare(`DELETE FROM likes WHERE user_id = ? AND post_id = ?`);
const getLikeStmt = db.prepare(`SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?`);
const countLikesStmt = db.prepare(`SELECT COUNT(*) AS n FROM likes WHERE post_id = ?`);

const insertCommentStmt = db.prepare(`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`);
const getCommentStmt = db.prepare(`
    SELECT c.id, c.post_id, c.content, c.created_at, c.user_id,
           u.username, u.avatar,
           (SELECT substr(p.content, 1, 200) FROM posts p WHERE p.id = c.post_id) AS post_snippet
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
`);
const listCommentsStmt = db.prepare(`
    SELECT c.id, c.post_id, c.content, c.created_at, c.user_id,
           u.username, u.avatar,
           (SELECT substr(p.content, 1, 200) FROM posts p WHERE p.id = c.post_id) AS post_snippet
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT ? OFFSET ?
`);
const getCommentOwnerStmt = db.prepare(`SELECT user_id FROM comments WHERE id = ?`);
const deleteCommentStmt = db.prepare(`DELETE FROM comments WHERE id = ?`);

const insertFollowStmt = db.prepare(`INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`);
const deleteFollowStmt = db.prepare(`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`);
const getFollowStmt = db.prepare(`SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?`);
const countFollowersStmt = db.prepare(`SELECT COUNT(*) AS n FROM follows WHERE following_id = ?`);
const countFollowingStmt = db.prepare(`SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?`);
const listFollowingStmt = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.created_at,
           CASE WHEN f2.follower_id IS NOT NULL THEN 1 ELSE 0 END AS is_following
    FROM follows f
    JOIN users u ON u.id = f.following_id
    LEFT JOIN follows f2 ON f2.follower_id = ? AND f2.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
`);
const listFollowersStmt = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.created_at,
           CASE WHEN f2.follower_id IS NOT NULL THEN 1 ELSE 0 END AS is_following
    FROM follows f
    JOIN users u ON u.id = f.follower_id
    LEFT JOIN follows f2 ON f2.follower_id = ? AND f2.following_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
`);

const countUserPostsStmt = db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE user_id = ?`);
const countUserFavoritesStmt = db.prepare(`SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?`);

interface PostRow {
    id: number;
    user_id: number;
    content: string;
    created_at: string;
    username: string;
    avatar: string | null;
    comments_count: number;
    likes_count: number;
    favorites_count: number;
}

interface CommentRow {
    id: number;
    post_id: number;
    content: string;
    created_at: string;
    user_id: number;
    username: string;
    avatar: string | null;
    post_snippet: string;
}

function hydratePosts(rows: PostRow[], viewerId: number | null): Post[] {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const placeholders = ids.map(() => "?").join(",");

    const images = new Map<number, string[]>();
    const imageRows = db
        .query<{ post_id: number; path: string }, number[]>(
            `SELECT post_id, path FROM post_images WHERE post_id IN (${placeholders})`,
        )
        .all(...ids);
    for (const row of imageRows) {
        const arr = images.get(row.post_id) ?? [];
        arr.push(row.path);
        images.set(row.post_id, arr);
    }

    const tagMap = new Map<number, string[]>();
    const tagRows = db
        .query<{ post_id: number; name: string }, number[]>(
            `SELECT pt.post_id, t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id IN (${placeholders})`,
        )
        .all(...ids);
    for (const row of tagRows) {
        const arr = tagMap.get(row.post_id) ?? [];
        arr.push(row.name);
        tagMap.set(row.post_id, arr);
    }

    const favIds = new Set<number>();
    const likedIds = new Set<number>();
    const followAuthorIds = new Set<number>();
    if (viewerId != null) {
        const favRows = db
            .query<{ post_id: number }, number[]>(
                `SELECT post_id FROM favorites WHERE user_id = ? AND post_id IN (${placeholders})`,
            )
            .all(viewerId, ...ids);
        for (const row of favRows) favIds.add(row.post_id);

        const likeRows = db
            .query<{ post_id: number }, number[]>(
                `SELECT post_id FROM likes WHERE user_id = ? AND post_id IN (${placeholders})`,
            )
            .all(viewerId, ...ids);
        for (const row of likeRows) likedIds.add(row.post_id);

        const authorIds = [...new Set(rows.map((row) => row.user_id))];
        if (authorIds.length > 0) {
            const authorPlaceholders = authorIds.map(() => "?").join(",");
            const followRows = db
                .query<{ following_id: number }, number[]>(
                    `SELECT following_id FROM follows WHERE follower_id = ? AND following_id IN (${authorPlaceholders})`,
                )
                .all(viewerId, ...authorIds);
            for (const row of followRows) followAuthorIds.add(row.following_id);
        }
    }

    return rows.map((row) => ({
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        author: { id: row.user_id, username: row.username, avatar: row.avatar, created_at: "" },
        images: images.get(row.id) ?? [],
        tags: tagMap.get(row.id) ?? [],
        comments_count: row.comments_count,
        likes_count: row.likes_count,
        favorites_count: row.favorites_count,
        is_liked: likedIds.has(row.id),
        is_favorited: favIds.has(row.id),
        is_following_author: followAuthorIds.has(row.user_id),
    }));
}

function toComment(row: CommentRow): Comment {
    return {
        id: row.id,
        post_id: row.post_id,
        content: row.content,
        created_at: row.created_at,
        author: { id: row.user_id, username: row.username, avatar: row.avatar, created_at: "" },
        post_snippet: row.post_snippet,
    };
}

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

export function findUserByUsernameOrEmail(login: string): User | null {
    return (findByEmailStmt.get(login) as User | null) ?? (findByUsernameStmt.get(login) as User | null);
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

export function getSpaceUser(id: number): SpaceUser | null {
    const row = getSpaceUserStmt.get(id) as
        | (Omit<SpaceUser, "is_favorites_public" | "is_follows_public"> & {
              is_favorites_public: number;
              is_follows_public: number;
          })
        | null;
    if (!row) return null;
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        avatar: row.avatar,
        created_at: row.created_at,
        is_favorites_public: row.is_favorites_public === 1,
        is_follows_public: row.is_follows_public === 1,
    };
}

export function userExists(id: number): boolean {
    return userExistsStmt.get(id) !== null;
}

export function getPostOwner(id: number): number | null {
    const row = getPostOwnerStmt.get(id) as { user_id: number } | null;
    return row?.user_id ?? null;
}

export function createPost(userId: number, content: string, imagePaths: string[], tags: string[]): Post | null {
    const result = insertPostStmt.run(userId, content);
    const postId = Number(result.lastInsertRowid);
    for (const path of imagePaths) insertPostImageStmt.run(postId, path);
    for (const tag of tags) {
        insertTagStmt.run(tag);
        const tagRow = getTagIdStmt.get(tag) as { id: number } | null;
        if (tagRow) insertPostTagStmt.run(postId, tagRow.id);
    }
    return getPostById(postId, userId);
}

export function getPostById(id: number, viewerId: number | null): Post | null {
    const row = getPostStmt.get(id) as PostRow | null;
    if (!row) return null;
    return hydratePosts([row], viewerId)[0]!;
}

export function listPosts(options: {
    offset: number;
    limit: number;
    tag?: string | null;
    sort?: "latest" | "hot";
    viewerId: number | null;
}): Post[] {
    const rows =
        options.sort === "hot"
            ? ((options.tag
                  ? (listHotPostsByTagStmt.all(options.tag, options.limit, options.offset) as PostRow[])
                  : (listHotPostsStmt.all(options.limit, options.offset) as PostRow[])) as PostRow[])
            : options.tag
              ? (listPostsByTagStmt.all(options.tag, options.limit, options.offset) as PostRow[])
              : (listPostsStmt.all(options.limit, options.offset) as PostRow[]);
    return hydratePosts(rows, options.viewerId);
}

export function listUserPosts(
    userId: number,
    options: { offset: number; limit: number; viewerId: number | null },
): Post[] {
    const rows = listUserPostsStmt.all(userId, options.limit, options.offset) as PostRow[];
    return hydratePosts(rows, options.viewerId);
}

export function listUserFavorites(
    userId: number,
    options: { offset: number; limit: number; viewerId: number | null },
): Post[] {
    const rows = listUserFavoritesStmt.all(userId, options.limit, options.offset) as PostRow[];
    return hydratePosts(rows, options.viewerId);
}

export function deletePost(id: number): string[] {
    const images = (getPostImagesStmt.all(id) as { path: string }[]).map((row) => row.path);
    deletePostImagesStmt.run(id);
    deletePostTagsStmt.run(id);
    deletePostFavoritesStmt.run(id);
    deletePostCommentsStmt.run(id);
    deletePostStmt.run(id);
    return images;
}

export function listTags(): string[] {
    return (listTagsStmt.all() as { name: string }[]).map((row) => row.name);
}

export function toggleFavorite(userId: number, postId: number): { favorited: boolean; favorites_count: number } {
    if (getFavoriteStmt.get(userId, postId)) {
        deleteFavoriteStmt.run(userId, postId);
        return { favorited: false, favorites_count: (countFavoritesStmt.get(postId) as { n: number }).n };
    }
    insertFavoriteStmt.run(userId, postId);
    return { favorited: true, favorites_count: (countFavoritesStmt.get(postId) as { n: number }).n };
}

export function unfavoritePost(userId: number, postId: number): { favorited: boolean; favorites_count: number } {
    deleteFavoriteStmt.run(userId, postId);
    return { favorited: false, favorites_count: (countFavoritesStmt.get(postId) as { n: number }).n };
}

export function isFavorited(userId: number, postId: number): boolean {
    return getFavoriteStmt.get(userId, postId) !== null;
}

export function toggleLike(userId: number, postId: number): { liked: boolean; likes_count: number } {
    if (getLikeStmt.get(userId, postId)) {
        deleteLikeStmt.run(userId, postId);
        return { liked: false, likes_count: (countLikesStmt.get(postId) as { n: number }).n };
    }
    insertLikeStmt.run(userId, postId);
    return { liked: true, likes_count: (countLikesStmt.get(postId) as { n: number }).n };
}

export function unlikePost(userId: number, postId: number): { liked: boolean; likes_count: number } {
    deleteLikeStmt.run(userId, postId);
    return { liked: false, likes_count: (countLikesStmt.get(postId) as { n: number }).n };
}

export function isLiked(userId: number, postId: number): boolean {
    return getLikeStmt.get(userId, postId) !== null;
}

export function createComment(userId: number, postId: number, content: string): Comment | null {
    const result = insertCommentStmt.run(postId, userId, content);
    const row = getCommentStmt.get(Number(result.lastInsertRowid)) as CommentRow | null;
    return row ? toComment(row) : null;
}

export function listComments(postId: number, options: { offset: number; limit: number }): Comment[] {
    const rows = listCommentsStmt.all(postId, options.limit, options.offset) as CommentRow[];
    return rows.map(toComment);
}

export function getCommentOwner(id: number): number | null {
    const row = getCommentOwnerStmt.get(id) as { user_id: number } | null;
    return row?.user_id ?? null;
}

export function deleteComment(id: number): boolean {
    return deleteCommentStmt.run(id).changes > 0;
}

export function toggleFollow(followerId: number, followingId: number): { following: boolean; followers_count: number } {
    if (getFollowStmt.get(followerId, followingId)) {
        deleteFollowStmt.run(followerId, followingId);
        return { following: false, followers_count: (countFollowersStmt.get(followingId) as { n: number }).n };
    }
    insertFollowStmt.run(followerId, followingId);
    return { following: true, followers_count: (countFollowersStmt.get(followingId) as { n: number }).n };
}

export function unfollowUser(followerId: number, followingId: number): { following: boolean; followers_count: number } {
    deleteFollowStmt.run(followerId, followingId);
    return { following: false, followers_count: (countFollowersStmt.get(followingId) as { n: number }).n };
}

export function isFollowing(followerId: number, followingId: number): boolean {
    return getFollowStmt.get(followerId, followingId) !== null;
}

export function listFollowing(
    ownerId: number,
    viewerId: number | null,
    options: { offset: number; limit: number },
): FollowUser[] {
    const rows = listFollowingStmt.all(viewerId ?? 0, ownerId, options.limit, options.offset) as (UserSummary & {
        is_following: number;
    })[];
    return rows.map((row) => ({ ...row, is_following: row.is_following === 1 }));
}

export function listFollowers(
    ownerId: number,
    viewerId: number | null,
    options: { offset: number; limit: number },
): FollowUser[] {
    const rows = listFollowersStmt.all(viewerId ?? 0, ownerId, options.limit, options.offset) as (UserSummary & {
        is_following: number;
    })[];
    return rows.map((row) => ({ ...row, is_following: row.is_following === 1 }));
}

export function getSpaceCounts(userId: number): {
    posts: number;
    favorites: number;
    following: number;
    followers: number;
} {
    return {
        posts: (countUserPostsStmt.get(userId) as { n: number }).n,
        favorites: (countUserFavoritesStmt.get(userId) as { n: number }).n,
        following: (countFollowingStmt.get(userId) as { n: number }).n,
        followers: (countFollowersStmt.get(userId) as { n: number }).n,
    };
}

export function updatePrivacy(
    userId: number,
    isFavoritesPublic: boolean | undefined,
    isFollowsPublic: boolean | undefined,
): void {
    const sets: string[] = [];
    const params: (number | boolean)[] = [];
    if (isFavoritesPublic !== undefined) {
        sets.push("is_favorites_public = ?");
        params.push(isFavoritesPublic ? 1 : 0);
    }
    if (isFollowsPublic !== undefined) {
        sets.push("is_follows_public = ?");
        params.push(isFollowsPublic ? 1 : 0);
    }
    if (sets.length === 0) return;
    db.run(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...params, userId]);
}
