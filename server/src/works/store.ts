import { and, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { db as mainDb } from "../db/client";
import { users } from "../db/schema";
import { db } from "./db";
import { workCommentLikes, workComments, workFavorites, workFiles, workLikes, works } from "./schema";
import type { UserSummary, WorkComment, WorkFile, WorkRow, WorkSummary } from "./types";
import { fetchFollowedAuthors } from "../db/helpers.ts";

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
    const viewer =
        viewerId == null ? { liked: new Set<number>(), favorited: new Set<number>() } : fetchViewerLikes(viewerId, ids);
    const followAuthorIds =
        viewerId == null ? new Set<number>() : fetchFollowedAuthors(viewerId, [...new Set(rows.map((r) => r.user_id))]);
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
        is_following_author: followAuthorIds.has(row.user_id),
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
    for (const file of fileRows)
        db.insert(workFiles)
            .values({ work_id: work.id, ...file })
            .run();
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
    db.update(works)
        .set({ title, description, cover, updated_at: new Date().toISOString() })
        .where(eq(works.id, id))
        .run();
    db.delete(workFiles).where(eq(workFiles.work_id, id)).run();
    for (const file of fileRows)
        db.insert(workFiles)
            .values({ work_id: id, ...file })
            .run();
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
        const authorFilter = authorId != null ? sql`WHERE w.user_id = ${authorId}` : sql``;
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

export function listForks(
    workId: number,
    options: { offset: number; limit: number; viewerId: number | null },
): WorkSummary[] {
    const rows = workBoard(eq(works.parent_id, workId))
        .orderBy(desc(works.created_at), desc(works.id))
        .limit(options.limit)
        .offset(options.offset)
        .all() as WorkRow[];
    return hydrateWorks(rows, options.viewerId);
}

function countLikes(workId: number): number {
    return db.select({ n: count() }).from(workLikes).where(eq(workLikes.work_id, workId)).get()!.n;
}

export function toggleWorkLike(userId: number, workId: number): { liked: boolean; likes_count: number } {
    const existing = db
        .select({ id: workLikes.id })
        .from(workLikes)
        .where(and(eq(workLikes.user_id, userId), eq(workLikes.work_id, workId)))
        .get();
    if (existing) {
        db.delete(workLikes)
            .where(and(eq(workLikes.user_id, userId), eq(workLikes.work_id, workId)))
            .run();
        return { liked: false, likes_count: countLikes(workId) };
    }
    db.insert(workLikes).values({ user_id: userId, work_id: workId }).onConflictDoNothing().run();
    return { liked: true, likes_count: countLikes(workId) };
}

export function unlikeWork(userId: number, workId: number): { liked: boolean; likes_count: number } {
    db.delete(workLikes)
        .where(and(eq(workLikes.user_id, userId), eq(workLikes.work_id, workId)))
        .run();
    return { liked: false, likes_count: countLikes(workId) };
}

function countFavorites(workId: number): number {
    return db.select({ n: count() }).from(workFavorites).where(eq(workFavorites.work_id, workId)).get()!.n;
}

export function toggleWorkFavorite(userId: number, workId: number): { favorited: boolean; favorites_count: number } {
    const existing = db
        .select({ id: workFavorites.id })
        .from(workFavorites)
        .where(and(eq(workFavorites.user_id, userId), eq(workFavorites.work_id, workId)))
        .get();
    if (existing) {
        db.delete(workFavorites)
            .where(and(eq(workFavorites.user_id, userId), eq(workFavorites.work_id, workId)))
            .run();
        return { favorited: false, favorites_count: countFavorites(workId) };
    }
    db.insert(workFavorites).values({ user_id: userId, work_id: workId }).onConflictDoNothing().run();
    return { favorited: true, favorites_count: countFavorites(workId) };
}

export function unfavoriteWork(userId: number, workId: number): { favorited: boolean; favorites_count: number } {
    db.delete(workFavorites)
        .where(and(eq(workFavorites.user_id, userId), eq(workFavorites.work_id, workId)))
        .run();
    return { favorited: false, favorites_count: countFavorites(workId) };
}

export function createWorkComment(
    userId: number,
    workId: number,
    content: string,
    parentId?: number | null,
): WorkComment | null {
    const insertValues = parentId
        ? { work_id: workId, user_id: userId, content, parent_id: parentId }
        : { work_id: workId, user_id: userId, content };
    const result = db.insert(workComments).values(insertValues).returning().get();
    const author = fetchAuthors([userId]).get(userId) ?? { username: "未知用户", avatar: null };
    return {
        id: result.id,
        work_id: workId,
        parent_id: result.parent_id ?? null,
        content: result.content,
        created_at: result.created_at,
        author: { id: userId, ...author, created_at: "" },
        likes_count: 0,
        is_liked: false,
        replies: [],
    };
}

interface WorkCommentFlat {
    id: number;
    work_id: number;
    parent_id: number | null;
    user_id: number;
    content: string;
    created_at: string;
}

function countWorkCommentLikes(commentIds: number[]): Map<number, number> {
    const map = new Map<number, number>();
    if (commentIds.length === 0) return map;
    const rows = db
        .select({ comment_id: workCommentLikes.work_comment_id, n: count() })
        .from(workCommentLikes)
        .where(inArray(workCommentLikes.work_comment_id, commentIds))
        .groupBy(workCommentLikes.work_comment_id)
        .all();
    for (const row of rows) map.set(row.comment_id, row.n);
    return map;
}

function fetchLikedWorkComments(viewerId: number | null, commentIds: number[]): Set<number> {
    const set = new Set<number>();
    if (viewerId == null || commentIds.length === 0) return set;
    const rows = db
        .select({ comment_id: workCommentLikes.work_comment_id })
        .from(workCommentLikes)
        .where(and(eq(workCommentLikes.user_id, viewerId), inArray(workCommentLikes.work_comment_id, commentIds)))
        .all();
    for (const row of rows) set.add(row.comment_id);
    return set;
}

export function listWorkComments(
    workId: number,
    viewerId: number | null,
    options: { offset: number; limit: number },
): WorkComment[] {
    const commentSelect = {
        id: workComments.id,
        work_id: workComments.work_id,
        parent_id: workComments.parent_id,
        user_id: workComments.user_id,
        content: workComments.content,
        created_at: workComments.created_at,
    } as const;
    const rows = db
        .select(commentSelect)
        .from(workComments)
        .where(eq(workComments.work_id, workId))
        .orderBy(desc(workComments.created_at), desc(workComments.id))
        .all() as unknown as WorkCommentFlat[];

    const authors = fetchAuthors([...new Set(rows.map((r) => r.user_id))]);
    const likeCounts = countWorkCommentLikes(rows.map((r) => r.id));
    const likedIds = fetchLikedWorkComments(
        viewerId,
        rows.map((r) => r.id),
    );

    const withAuthor: (WorkCommentFlat & { author: UserSummary })[] = rows.map((row) => ({
        ...row,
        author: {
            id: row.user_id,
            username: authors.get(row.user_id)?.username ?? "未知用户",
            avatar: authors.get(row.user_id)?.avatar ?? null,
            created_at: "",
        },
    }));

    const roots = withAuthor.filter((c) => c.parent_id == null);
    const childrenMap = new Map<number, (WorkCommentFlat & { author: UserSummary })[]>();
    for (const c of withAuthor) {
        if (c.parent_id == null) continue;
        const arr = childrenMap.get(c.parent_id) ?? [];
        arr.push(c);
        childrenMap.set(c.parent_id, arr);
    }
    const descendants = new Map<number, (WorkCommentFlat & { author: UserSummary })[]>();
    const collect = (rootId: number): (WorkCommentFlat & { author: UserSummary })[] => {
        if (descendants.has(rootId)) return descendants.get(rootId)!;
        const out: (WorkCommentFlat & { author: UserSummary })[] = [];
        const queue = [rootId];
        while (queue.length > 0) {
            const pid = queue.shift()!;
            const kids = childrenMap.get(pid) ?? [];
            for (const k of kids) {
                out.push(k);
                queue.push(k.id);
            }
        }
        out.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
        descendants.set(rootId, out);
        return out;
    };

    const pagedRoots = roots.slice(options.offset, options.offset + options.limit);
    const toComment = (flat: WorkCommentFlat & { author: UserSummary }): WorkComment => ({
        id: flat.id,
        work_id: flat.work_id,
        parent_id: flat.parent_id,
        content: flat.content,
        created_at: flat.created_at,
        author: flat.author,
        likes_count: likeCounts.get(flat.id) ?? 0,
        is_liked: likedIds.has(flat.id),
        replies: [],
    });

    return pagedRoots.map((root) => ({
        ...toComment(root),
        replies: collect(root.id).map(toComment),
    }));
}

export function getWorkCommentOwner(id: number): number | null {
    const row = db.select({ user_id: workComments.user_id }).from(workComments).where(eq(workComments.id, id)).get();
    return row?.user_id ?? null;
}

export function workCommentBelongsToWork(commentId: number, workId: number): boolean {
    const row = db
        .select({ work_id: workComments.work_id })
        .from(workComments)
        .where(eq(workComments.id, commentId))
        .get();
    return row != null && row.work_id === workId;
}

function countWorkCommentLikesFor(commentId: number): number {
    return db
        .select({ n: count() })
        .from(workCommentLikes)
        .where(eq(workCommentLikes.work_comment_id, commentId))
        .get()!.n;
}

export function toggleWorkCommentLike(userId: number, commentId: number): { liked: boolean; likes_count: number } {
    const existing = db
        .select({ id: workCommentLikes.id })
        .from(workCommentLikes)
        .where(and(eq(workCommentLikes.user_id, userId), eq(workCommentLikes.work_comment_id, commentId)))
        .get();
    if (existing) {
        db.delete(workCommentLikes)
            .where(and(eq(workCommentLikes.user_id, userId), eq(workCommentLikes.work_comment_id, commentId)))
            .run();
        return { liked: false, likes_count: countWorkCommentLikesFor(commentId) };
    }
    db.insert(workCommentLikes).values({ user_id: userId, work_comment_id: commentId }).onConflictDoNothing().run();
    return { liked: true, likes_count: countWorkCommentLikesFor(commentId) };
}

export function unlikeWorkComment(userId: number, commentId: number): { liked: boolean; likes_count: number } {
    db.delete(workCommentLikes)
        .where(and(eq(workCommentLikes.user_id, userId), eq(workCommentLikes.work_comment_id, commentId)))
        .run();
    return { liked: false, likes_count: countWorkCommentLikesFor(commentId) };
}

export function deleteWorkComment(id: number): boolean {
    const row = db.select({ id: workComments.id }).from(workComments).where(eq(workComments.id, id)).get();
    const descendantIds = [id];
    const queue = [id];
    while (queue.length > 0) {
        const pid = queue.shift()!;
        const kids = db.select({ id: workComments.id }).from(workComments).where(eq(workComments.parent_id, pid)).all();
        for (const kid of kids) {
            descendantIds.push(kid.id);
            queue.push(kid.id);
        }
    }
    if (descendantIds.length > 0) {
        db.delete(workCommentLikes).where(inArray(workCommentLikes.work_comment_id, descendantIds)).run();
        db.delete(workComments).where(inArray(workComments.id, descendantIds)).run();
    }
    return row != null;
}

export async function searchWorks(options: {
    offset: number;
    limit: number;
    sort?: "latest" | "hot";
    keyword: string;
}): Promise<WorkSummary[]> {
    const { offset, limit, sort = "latest", keyword } = options;

    let rows: WorkRow[];

    if (sort === "hot") {
        rows = db.all(sql`
            SELECT *, ((likes_count * 3 + favorites_count * 4 + comments_count * 5 + 1)
                / (1 + ln(1 + (julianday('now') - julianday(created_at)) * 24))) AS heat
            FROM (
                SELECT w.id, w.user_id, w.title, w.description, w.cover, w.parent_id, w.created_at, w.updated_at,
                    (SELECT COUNT(*) FROM work_comments c WHERE c.work_id = w.id) AS comments_count,
                    (SELECT COUNT(*) FROM work_likes l WHERE l.work_id = w.id) AS likes_count,
                    (SELECT COUNT(*) FROM work_favorites f WHERE f.work_id = w.id) AS favorites_count,
                    (SELECT COUNT(*) FROM work_files wf WHERE wf.work_id = w.id) AS files_count
                FROM works w
                WHERE w.title LIKE ${`%${keyword}%`} OR w.description LIKE ${`%${keyword}%`}
            )
            ORDER BY heat DESC, created_at DESC, id DESC
            LIMIT ${limit} OFFSET ${offset}
        `) as unknown as WorkRow[];
    } else {
        const whereCond = or(like(works.title, `%${keyword}%`), like(works.description, `%${keyword}%`));
        rows = workBoard(whereCond)
            .orderBy(desc(works.created_at), desc(works.id))
            .limit(limit)
            .offset(offset)
            .all() as WorkRow[];
    }

    return hydrateWorks(rows, null);
}
