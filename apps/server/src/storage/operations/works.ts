import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredWork, StoredWorkComment, StoredWorkLike } from "../rows";
import { fetchAuthors } from "./works-helpers";
import { buildWorks, heatWork, type WorkHydrationContext } from "../mappers";
import type { Work, WorkRowWithCounts } from "../types";
import type { WorksRepo } from "../plugin";

async function boardWorks(store: CollectionStore): Promise<WorkRowWithCounts[]> {
    const [works, comments, likes] = await Promise.all([
        store.read<StoredWork>(C.works),
        store.read<StoredWorkComment>(C.worksComments),
        store.read<StoredWorkLike>(C.worksLikes),
    ]);
    return works.map((work) => ({
        id: work.id,
        user_id: work.user_id,
        title: work.title,
        description: work.description,
        cover: work.cover,
        git_path: work.git_path,
        likes_count: likes.filter((l) => l.work_id === work.id).length,
        comments_count: comments.filter((c) => c.work_id === work.id).length,
    }));
}

async function hydrateWorks(
    store: CollectionStore,
    rows: WorkRowWithCounts[],
    viewerId: number | null,
): Promise<Work[]> {
    if (rows.length === 0) return [];
    const [authors, likes] = await Promise.all([
        fetchAuthors(store, [...new Set(rows.map((row) => row.user_id))]),
        store.read<StoredWorkLike>(C.worksLikes),
    ]);
    const likedIds = new Set<number>();
    if (viewerId != null) {
        for (const like of likes)
            if (like.user_id === viewerId && rows.some((row) => row.id === like.work_id)) likedIds.add(like.work_id);
    }
    const ctx: WorkHydrationContext = { authors, likedIds };
    return buildWorks(rows, ctx);
}

export function createWorksRepo(store: CollectionStore): WorksRepo {
    return {
        async getWorkOwner(workId) {
            const work = await store.getById<StoredWork>(C.works, workId);
            return work?.user_id ?? null;
        },

        async createWork(userId, data) {
            const work = await store.insert<StoredWork>(C.works, {
                user_id: userId,
                title: data.title ?? null,
                description: data.description ?? null,
                cover: data.cover ?? null,
                git_path: data.git_path ?? null,
            });
            return this.getWorkById(work.id, userId);
        },

        async getWorkById(id, viewerId) {
            const rows = await boardWorks(store);
            const row = rows.find((r) => r.id === id);
            if (!row) return null;
            return (await hydrateWorks(store, [row], viewerId))[0] ?? null;
        },

        async listWorks(options) {
            const { offset, limit, viewerId, sort = "latest" } = options;
            let rows = await boardWorks(store);
            if (sort === "hot") {
                rows = [...rows].sort(
                    (a, b) =>
                        heatWork(b.likes_count, b.comments_count) - heatWork(a.likes_count, a.comments_count) ||
                        b.id - a.id,
                );
            } else {
                rows = [...rows].sort((a, b) => b.id - a.id);
            }
            return hydrateWorks(store, rows.slice(offset, offset + limit), viewerId);
        },

        async updateWork(id, data) {
            const patch: Partial<StoredWork> = {};
            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined) (patch as Record<string, unknown>)[key] = value;
            }
            if (Object.keys(patch).length > 0) {
                await store.updateById<StoredWork>(C.works, id, patch);
            }
            return this.getWorkById(id, (await this.getWorkOwner(id)) ?? null);
        },

        async deleteWork(id) {
            const work = await store.getById<StoredWork>(C.works, id);
            const cover = work?.cover ?? null;
            await store.deleteWhere<StoredWork>(C.works, (row) => row.id === id);
            return { coverPath: cover };
        },

        async toggleWorkLike(userId, workId) {
            const rows = await store.read<StoredWorkLike>(C.worksLikes);
            const existing = rows.find((row) => row.user_id === userId && row.work_id === workId);
            if (existing) {
                await store.deleteWhere<StoredWorkLike>(
                    C.worksLikes,
                    (row) => row.user_id === userId && row.work_id === workId,
                );
                return { liked: false, likes_count: rows.filter((row) => row.work_id === workId).length - 1 };
            }
            await store.insert<StoredWorkLike>(C.worksLikes, {
                user_id: userId,
                work_id: workId,
                created_at: new Date().toISOString(),
            });
            return { liked: true, likes_count: rows.filter((row) => row.work_id === workId).length + 1 };
        },

        async unlikeWork(userId, workId) {
            const rows = await store.read<StoredWorkLike>(C.worksLikes);
            await store.deleteWhere<StoredWorkLike>(
                C.worksLikes,
                (row) => row.user_id === userId && row.work_id === workId,
            );
            return { liked: false, likes_count: rows.filter((row) => row.work_id === workId).length - 1 };
        },

        async searchWorks(options) {
            const { offset, limit, keyword, sort = "latest" } = options;
            const kw = keyword.toLowerCase();
            let rows = (await boardWorks(store)).filter(
                (row) =>
                    (row.title?.toLowerCase().includes(kw) ?? false) ||
                    (row.description?.toLowerCase().includes(kw) ?? false),
            );
            if (sort === "hot") {
                rows = [...rows].sort(
                    (a, b) =>
                        heatWork(b.likes_count, b.comments_count) - heatWork(a.likes_count, a.comments_count) ||
                        b.id - a.id,
                );
            } else {
                rows = [...rows].sort((a, b) => b.id - a.id);
            }
            return hydrateWorks(store, rows.slice(offset, offset + limit), null);
        },
    };
}
