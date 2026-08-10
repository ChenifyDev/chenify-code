import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db as mainDb } from "../db/client";
import { users } from "../db/schema";
import { db } from "./db";
import { workComments, workFavorites, workFiles, workLikes, works } from "./schema";
import type { WorkComment, WorkFile, WorkRow, WorkSummary } from "./types";

const countCommentsSub = sql<number>`(select count(*) from ${workComments} c where c.work_id = works.id)`;
const countLikesSub = sql<number>`(select count(*) from ${workLikes} l where l.work_id = works.id)`;
const countFavoritesSub = sql<number>`(select count(*) from ${workFavorites} f where f.work_id = works.id)`;
const countFilesSub = sql<number>`(select count(*) from ${workFiles} wf where wf.work_id = works.id)`;

const workSelect = {
    id: works.id,
    user_id: works.user_id,
    title: works.title,
    description: works.description,
    cover: works.cover,
    parent_id: works.parent_id,
    created_at: works.created_at,
    updated_at: works.updated_at,
    comments_count: countCommentsSub,
    likes_count: countLikesSub,
    favorites_count: countFavoritesSub,
    files_count: countFilesSub,
} as const;

function workBoard(where?: SQL) {
    const q = db.select(workSelect).from(works);
    return where ? q.where(where) : q;
}

function fetchAuthors(userIds: number[]): Map<number, { username: string; avatar: string | null }> {
    const map = new Map<number, { username: string; avatar: string | null }>();
    if (userIds.length === 0) return map;
    const rows = mainDb
        .select({ id: users.id, username: users.username, avatar: users.avatar })
        .from(users)
        .where(inArray(users.id, userIds))
        .all();
    for (const row of rows) map.set(row.id, { username: row.username, avatar: row.avatar });
    return map;
}

function fetchViewerLikes(viewerId: number, ids: number[]): { liked: Set<number>; favorited: Set<number> } {
    const liked = new Set<number>();
    const favorited = new Set<number>();
    if (ids.length === 0) return { liked, favorited };
    const likeRows = db
        .select({ work_id: workLikes.work_id })
        .from(workLikes)
        .where(and(eq(workLikes.user_id, viewerId), inArray(workLikes.work_id, ids)))
        .all();
    for (const row of likeRows) liked.add(row.work_id);
    const favRows = db
        .select({ work_id: workFavorites.work_id })
        .from(workFavorites)
        .where(and(eq(workFavorites.user_id, viewerId), inArray(workFavorites.work_id, ids)))
        .all();
    for (const row of favRows) favorited.add(row.work_id);
    return { liked, favorited };
}

function hydrateWorks(rows: WorkRow[], viewerId: number | null): WorkSummary[] {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const authors = fetchAuthors([...new Set(rows.map((r) => r.user_id))]);
    const viewer = viewerId == null ? { liked: new Set<number>(), favorited: new Set<number>() } : fetchViewerLikes(viewerId, ids);
    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        cover: row.cover,
        parent_id: row.parent_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        author: {
            id: row.user_id,
            username: authors.get(row.user_id)?.username ?? "未知用户",
            avatar: authors.get(row.user_id)?.avatar ?? null,
            created_at: "",
        },
        files_count: row.files_count,
        comments_count: row.comments_count,
        likes_count: row.likes_count,
        favorites_count: row.favorites_count,
        is_liked: viewer.liked.has(row.id),
        is_favorited: viewer.favorited.has(row.id),
    }));
}

function getWorkFiles(workId: number): WorkFile[] {
    return db
        .select({ id: workFiles.id, name: workFiles.name, path: workFiles.path, size: workFiles.size })
        .from(workFiles)
        .where(eq(workFiles.work_id, workId))
        .all();
}

export function getWorkOwner(workId: number): number | null {
    const row = db.select({ user_id: works.user_id }).from(works).where(eq(works.id, workId)).get();
    return row?.user_id ?? null;
}

export function createWork(
    userId: number,
    title: string,
    description: string,
    cover: string,
    parentId: number | null,
    fileRows: { name: string; path: string; size: number }[],
): (WorkSummary & { files: WorkFile[] }) | null {
    const work = db
        .insert(works)
        .values({ user_id: userId, title, description, cover, parent_id: parentId })
        .returning()
        .get();
    for (const file of fileRows) db.insert(workFiles).values({ work_id: work.id, ...file }).run();
    return getWorkById(work.id, userId);
}

export function getWorkById(id: number, viewerId: number | null): (WorkSummary & { files: WorkFile[] }) | null {
    const row = workBoard(eq(works.id, id)).get() as WorkRow | undefined;
    if (!row) return null;
    const [summary] = hydrateWorks([row], viewerId);
    if (!summary) return null;
    return { ...summary, files: getWorkFiles(id) };
}

export function updateWork(
    id: number,
    title: string,
    description: string,
    cover: string,
    fileRows: { name: string; path: string; size: number }[],
): { work: (WorkSummary & { files: WorkFile[] }) | null; removedFiles: string[]; removedCover: string | null } {
    const oldCover = db.select({ cover: works.cover }).from(works).where(eq(works.id, id)).get()?.cover ?? "";
    const oldPaths = getWorkFiles(id).map((f) => f.path);
    db.update(works).set({ title, description, cover, updated_at: new Date().toISOString() }).where(eq(works.id, id)).run();
    db.delete(workFiles).where(eq(workFiles.work_id, id)).run();
    for (const file of fileRows) db.insert(workFiles).values({ work_id: id, ...file }).run();
    const removedCover = oldCover !== cover && oldCover.startsWith("/uploads/") ? oldCover : null;
    return { work: getWorkById(id, getWorkOwner(id) ?? null), removedFiles: oldPaths, removedCover };
}

export function deleteWork(id: number): { filePaths: string[]; coverPath: string | null } {
    const oldPaths = getWorkFiles(id).map((f) => f.path);
    const coverPath = db.select({ cover: works.cover }).from(works).where(eq(works.id, id)).get()?.cover ?? "";
    db.delete(workLikes).where(eq(workLikes.work_id, id)).run();
    db.delete(workFavorites).where(eq(workFavorites.work_id, id)).run();
    db.delete(workComments).where(eq(workComments.work_id, id)).run();
    db.delete(workFiles).where(eq(workFiles.work_id, id)).run();
    db.delete(works).where(eq(works.id, id)).run();
    return { filePaths: oldPaths, coverPath: coverPath.startsWith("/uploads/") ? coverPath : null };
}

export function listWorks(options: {
    offset: number;
    limit: number;
    viewerId: number | null;
    authorId?: number | null;
    sort?: "latest" | "hot";
}): WorkSummary[] {
    const { offset, limit, viewerId, authorId } = options;

    if (options.sort === "hot") {
        const authorFilter =
            authorId != null
                ? sql`WHERE w.user_id = ${authorId}`
                : sql``;
        const rows = db.all(sql`
            SELECT *, ((likes_count * 3 + favorites_count * 4 + comments_count * 5 + 1)
                / (1 + ln(1 + (julianday('now') - julianday(created_at)) * 24))) AS heat
            FROM (
                SELECT w.id, w.user_id, w.title, w.description, w.cover, w.parent_id, w.created_at, w.updated_at,
                    (SELECT COUNT(*) FROM work_files wf WHERE wf.work_id = w.id) AS files_count,
                    (SELECT COUNT(*) FROM work_comments c WHERE c.work_id = w.id) AS comments_count,
                    (SELECT COUNT(*) FROM work_likes l WHERE l.work_id = w.id) AS likes_count,
                    (SELECT COUNT(*) FROM work_favorites f WHERE f.work_id = w.id) AS favorites_count
                FROM works w
                ${authorFilter}
            )
            ORDER BY heat DESC, created_at DESC, id DESC
            LIMIT ${limit} OFFSET ${offset}`) as unknown as WorkRow[];
        return hydrateWorks(rows, viewerId);
    }

    const where = authorId ? eq(works.user_id, authorId) : undefined;
    const rows = workBoard(where)
        .orderBy(desc(works.created_at), desc(works.id))
        .limit(limit)
        .offset(offset)
        .all() as WorkRow[];
    return hydrateWorks(rows, viewerId);
}

export function listForks(workId: number, options: { offset: number; limit: number; viewerId: number | null }): WorkSummary[] {
    const rows = workBoard(eq(works.parent_id, workId))
        .orderBy(desc(works.created_at), desc(works.id))
        .limit(options.limit)
        .offset(options.offset)
        .all() as WorkRow[];
    return hydrateWorks(rows, options.viewerId);
}

function countLikes(workId: number): number {
    return db.select({ n: sql<number>`count(*)` }).from(workLikes).where(eq(workLikes.work_id, workId)).get()!.n;
}

export function toggleWorkLike(userId: number, workId: number): { liked: boolean; likes_count: number } {
    const existing = db
        .select({ id: workLikes.id })
        .from(workLikes)
        .where(and(eq(workLikes.user_id, userId), eq(workLikes.work_id, workId)))
        .get();
    if (existing) {
        db.delete(workLikes).where(and(eq(workLikes.user_id, userId), eq(workLikes.work_id, workId))).run();
        return { liked: false, likes_count: countLikes(workId) };
    }
    db.insert(workLikes).values({ user_id: userId, work_id: workId }).onConflictDoNothing().run();
    return { liked: true, likes_count: countLikes(workId) };
}

export function unlikeWork(userId: number, workId: number): { liked: boolean; likes_count: number } {
    db.delete(workLikes).where(and(eq(workLikes.user_id, userId), eq(workLikes.work_id, workId))).run();
    return { liked: false, likes_count: countLikes(workId) };
}

function countFavorites(workId: number): number {
    return db.select({ n: sql<number>`count(*)` }).from(workFavorites).where(eq(workFavorites.work_id, workId)).get()!.n;
}

export function toggleWorkFavorite(userId: number, workId: number): { favorited: boolean; favorites_count: number } {
    const existing = db
        .select({ id: workFavorites.id })
        .from(workFavorites)
        .where(and(eq(workFavorites.user_id, userId), eq(workFavorites.work_id, workId)))
        .get();
    if (existing) {
        db.delete(workFavorites).where(and(eq(workFavorites.user_id, userId), eq(workFavorites.work_id, workId))).run();
        return { favorited: false, favorites_count: countFavorites(workId) };
    }
    db.insert(workFavorites).values({ user_id: userId, work_id: workId }).onConflictDoNothing().run();
    return { favorited: true, favorites_count: countFavorites(workId) };
}

export function unfavoriteWork(userId: number, workId: number): { favorited: boolean; favorites_count: number } {
    db.delete(workFavorites).where(and(eq(workFavorites.user_id, userId), eq(workFavorites.work_id, workId))).run();
    return { favorited: false, favorites_count: countFavorites(workId) };
}

export function createWorkComment(userId: number, workId: number, content: string): WorkComment | null {
    const result = db.insert(workComments).values({ work_id: workId, user_id: userId, content }).returning().get();
    const author = fetchAuthors([userId]).get(userId) ?? { username: "未知用户", avatar: null };
    return {
        id: result.id,
        work_id: workId,
        content: result.content,
        created_at: result.created_at,
        author: { id: userId, ...author, created_at: "" },
    };
}

export function listWorkComments(workId: number, options: { offset: number; limit: number }): WorkComment[] {
    const rows = db
        .select({
            id: workComments.id,
            work_id: workComments.work_id,
            user_id: workComments.user_id,
            content: workComments.content,
            created_at: workComments.created_at,
        })
        .from(workComments)
        .where(eq(workComments.work_id, workId))
        .orderBy(desc(workComments.created_at), desc(workComments.id))
        .limit(options.limit)
        .offset(options.offset)
        .all();
    const authors = fetchAuthors([...new Set(rows.map((r) => r.user_id))]);
    return rows.map((row) => ({
        id: row.id,
        work_id: row.work_id,
        content: row.content,
        created_at: row.created_at,
        author: {
            id: row.user_id,
            username: authors.get(row.user_id)?.username ?? "未知用户",
            avatar: authors.get(row.user_id)?.avatar ?? null,
            created_at: "",
        },
    }));
}

export function getWorkCommentOwner(id: number): number | null {
    const row = db.select({ user_id: workComments.user_id }).from(workComments).where(eq(workComments.id, id)).get();
    return row?.user_id ?? null;
}

export function deleteWorkComment(id: number): boolean {
    const row = db.select({ id: workComments.id }).from(workComments).where(eq(workComments.id, id)).get();
    db.delete(workComments).where(eq(workComments.id, id)).run();
    return row != null;
}