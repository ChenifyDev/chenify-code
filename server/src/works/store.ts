import { and, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { likes, works } from "./schema";
import { fetchAuthors } from "./helpers";
import type { Work, WorkRowWithCounts } from "./types";

const countCommentsSub = sql<number>`(select count(*) from comments c where c.work_id = works.id)`;
const countLikesSub = sql<number>`(select count(*) from likes l where l.work_id = works.id)`;

const workSelect = {
    id: works.id,
    user_id: works.user_id,
    title: works.title,
    description: works.description,
    cover: works.cover,
    git_path: works.git_path,
    comments_count: countCommentsSub,
    likes_count: countLikesSub,
} as const;

function workBoard(where?: SQL) {
    const q = db.select(workSelect).from(works);
    return where ? q.where(where) : q;
}

function fetchViewerLikes(viewerId: number | null, ids: number[]): Set<number> {
    const set = new Set<number>();
    if (viewerId == null || ids.length === 0) return set;
    const rows = db
        .select({ work_id: likes.work_id })
        .from(likes)
        .where(and(eq(likes.user_id, viewerId), inArray(likes.work_id, ids)))
        .all();
    for (const row of rows) set.add(row.work_id);
    return set;
}

function hydrateWorks(rows: WorkRowWithCounts[], viewerId: number | null): Work[] {
    if (rows.length === 0) return [];
    const authors = fetchAuthors([...new Set(rows.map((r) => r.user_id))]);
    const likedIds = fetchViewerLikes(
        viewerId,
        rows.map((r) => r.id),
    );
    return rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        cover: row.cover,
        git_path: row.git_path,
        likes_count: row.likes_count,
        comments_count: row.comments_count,
        author: authors.get(row.user_id) ?? { id: row.user_id, username: "未知用户", avatar: null, created_at: "" },
        is_liked: likedIds.has(row.id),
    }));
}

export function getWorkOwner(workId: number): number | null {
    const row = db.select({ user_id: works.user_id }).from(works).where(eq(works.id, workId)).get();
    return row?.user_id ?? null;
}

export function createWork(
    userId: number,
    data: { title?: string | null; description?: string | null; cover?: string | null; git_path?: string | null },
): Work | null {
    const patch: Partial<typeof data> = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) (patch as Record<string, unknown>)[key] = value;
    }
    const work = db
        .insert(works)
        .values({ user_id: userId, ...patch })
        .returning()
        .get();
    return getWorkById(work.id, userId);
}

export function getWorkById(id: number, viewerId: number | null): Work | null {
    const row = workBoard(eq(works.id, id)).get() as WorkRowWithCounts | undefined;
    if (!row) return null;
    return hydrateWorks([row], viewerId)[0]!;
}

export function listWorks(options: {
    offset: number;
    limit: number;
    viewerId: number | null;
    sort?: "latest" | "hot";
}): Work[] {
    const { offset, limit, viewerId } = options;

    if (options.sort === "hot") {
        const rows = db.all(sql`
            SELECT *, (likes_count * 3 + comments_count * 5 + 1) AS heat
            FROM (
                SELECT w.id, w.user_id, w.title, w.description, w.cover, w.git_path,
                    (SELECT COUNT(*) FROM comments c WHERE c.work_id = w.id) AS comments_count,
                    (SELECT COUNT(*) FROM likes l WHERE l.work_id = w.id) AS likes_count
                FROM works w
            )
            ORDER BY heat DESC, id DESC
            LIMIT ${limit} OFFSET ${offset}
        `) as unknown as WorkRowWithCounts[];
        return hydrateWorks(rows, viewerId);
    }

    const rows = workBoard()
        .orderBy(desc(works.id))
        .limit(limit)
        .offset(offset)
        .all() as WorkRowWithCounts[];
    return hydrateWorks(rows, viewerId);
}

export function updateWork(
    id: number,
    data: { title?: string | null; description?: string | null; cover?: string | null; git_path?: string | null },
): Work | null {
    const patch: Partial<typeof data> = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) (patch as Record<string, unknown>)[key] = value;
    }
    if (Object.keys(patch).length > 0) {
        db.update(works)
            .set(patch)
            .where(eq(works.id, id))
            .run();
    }
    return getWorkById(id, getWorkOwner(id) ?? null);
}

export function deleteWork(id: number): { coverPath: string | null } {
    const cover = db.select({ cover: works.cover }).from(works).where(eq(works.id, id)).get()?.cover ?? null;
    db.delete(works).where(eq(works.id, id)).run();
    return { coverPath: cover != null && cover.startsWith("/uploads/") ? cover : null };
}

function countWorkLikes(workId: number): number {
    return db.select({ n: count() }).from(likes).where(eq(likes.work_id, workId)).get()!.n;
}

export function toggleWorkLike(userId: number, workId: number): { liked: boolean; likes_count: number } {
    const existing = db
        .select({ id: likes.id })
        .from(likes)
        .where(and(eq(likes.user_id, userId), eq(likes.work_id, workId)))
        .get();
    if (existing) {
        db.delete(likes)
            .where(and(eq(likes.user_id, userId), eq(likes.work_id, workId)))
            .run();
        return { liked: false, likes_count: countWorkLikes(workId) };
    }
    db.insert(likes).values({ user_id: userId, work_id: workId }).onConflictDoNothing().run();
    return { liked: true, likes_count: countWorkLikes(workId) };
}

export function unlikeWork(userId: number, workId: number): { liked: boolean; likes_count: number } {
    db.delete(likes)
        .where(and(eq(likes.user_id, userId), eq(likes.work_id, workId)))
        .run();
    return { liked: false, likes_count: countWorkLikes(workId) };
}

export function searchWorks(options: {
    offset: number;
    limit: number;
    keyword: string;
    sort?: "latest" | "hot";
}): Work[] {
    const { offset, limit, keyword } = options;

    if (options.sort === "hot") {
        const rows = db.all(sql`
            SELECT *, (likes_count * 3 + comments_count * 5 + 1) AS heat
            FROM (
                SELECT w.id, w.user_id, w.title, w.description, w.cover, w.git_path,
                    (SELECT COUNT(*) FROM comments c WHERE c.work_id = w.id) AS comments_count,
                    (SELECT COUNT(*) FROM likes l WHERE l.work_id = w.id) AS likes_count
                FROM works w
                WHERE w.title LIKE ${`%${keyword}%`} OR w.description LIKE ${`%${keyword}%`}
            )
            ORDER BY heat DESC, id DESC
            LIMIT ${limit} OFFSET ${offset}
        `) as unknown as WorkRowWithCounts[];
        return hydrateWorks(rows, null);
    }

    const whereCond = or(like(works.title, `%${keyword}%`), like(works.description, `%${keyword}%`));
    const rows = workBoard(whereCond)
        .orderBy(desc(works.id))
        .limit(limit)
        .offset(offset)
        .all() as WorkRowWithCounts[];
    return hydrateWorks(rows, null);
}
