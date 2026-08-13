import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { workDraftFiles, workDrafts, workFiles, works, type WorkDraftRowRaw } from "./schema";
import { createWork, deleteWork, getWorkById } from "./store";
import type { WorkDraft, WorkFile } from "./types";

function getDraftFiles(id: number): WorkFile[] {
    return db
        .select({
            id: workDraftFiles.id,
            name: workDraftFiles.name,
            path: workDraftFiles.path,
            size: workDraftFiles.size,
        })
        .from(workDraftFiles)
        .where(eq(workDraftFiles.draft_id, id))
        .all();
}

function toDraft(row: WorkDraftRowRaw): WorkDraft {
    const files = getDraftFiles(row.id);
    return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        cover: row.cover,
        status: row.status,
        work_id: row.work_id,
        draft_id: null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        files_count: files.length,
        files,
    };
}

export function createWorkDraft(
    userId: number,
    data: {
        title: string;
        description: string;
        cover: string;
        fileRows: { name: string; path: string; size: number }[];
    },
): WorkDraft {
    const draft = db
        .insert(workDrafts)
        .values({ user_id: userId, title: data.title, description: data.description, cover: data.cover })
        .returning()
        .get();
    for (const file of data.fileRows)
        db.insert(workDraftFiles)
            .values({ draft_id: draft.id, ...file })
            .run();
    return toDraft(draft);
}

type WorkDraftMeta = Omit<WorkDraft, "files" | "files_count">;
type WorkDraftOrMeta = WorkDraftMeta & { files?: WorkFile[]; files_count?: number };

function getWorkFilesByWorkIds(workIds: number[]): Map<number, WorkFile[]> {
    const map = new Map<number, WorkFile[]>();
    if (workIds.length === 0) return map;
    const rows = db
        .select({
            id: workFiles.id,
            work_id: workFiles.work_id,
            name: workFiles.name,
            path: workFiles.path,
            size: workFiles.size,
        })
        .from(workFiles)
        .where(inArray(workFiles.work_id, workIds))
        .all();
    for (const row of rows) {
        const arr = map.get(row.work_id) ?? [];
        arr.push({ id: row.id, name: row.name, path: row.path, size: row.size });
        map.set(row.work_id, arr);
    }
    return map;
}

function toPublishedDraftMeta(row: {
    id: number;
    user_id: number;
    title: string;
    description: string;
    cover: string;
    created_at: string;
    updated_at: string;
}): WorkDraftMeta {
    return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        description: row.description,
        cover: row.cover,
        status: "published",
        work_id: row.id,
        draft_id: null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

function attachFilesToPage(entries: WorkDraftOrMeta[]): WorkDraft[] {
    const workIds = entries.filter((e) => e.status === "published" && e.work_id != null).map((e) => e.work_id!);
    const filesByWork = getWorkFilesByWorkIds(workIds);
    const draftByWork = new Map<number, number>();
    if (workIds.length > 0) {
        const rows = db
            .select({ id: workDrafts.id, work_id: workDrafts.work_id })
            .from(workDrafts)
            .where(inArray(workDrafts.work_id, workIds))
            .all();
        for (const row of rows) if (row.work_id != null) draftByWork.set(row.work_id, row.id);
    }
    return entries.map((e) => {
        const files = e.status === "published" ? (filesByWork.get(e.work_id!) ?? []) : (e.files ?? []);
        return {
            id: e.id,
            user_id: e.user_id,
            title: e.title,
            description: e.description,
            cover: e.cover,
            status: e.status,
            work_id: e.work_id,
            draft_id: e.status === "published" ? (draftByWork.get(e.work_id!) ?? null) : null,
            created_at: e.created_at,
            updated_at: e.updated_at,
            files,
            files_count: files.length,
        };
    });
}

export function listWorkDrafts(
    userId: number,
    options: { offset: number; limit: number; status?: "draft" | "published" },
): WorkDraft[] {
    if (options.status === "draft") {
        const rows = db
            .select()
            .from(workDrafts)
            .where(and(eq(workDrafts.user_id, userId), eq(workDrafts.status, "draft")))
            .orderBy(desc(workDrafts.updated_at), desc(workDrafts.id))
            .limit(options.limit)
            .offset(options.offset)
            .all() as unknown as WorkDraftRowRaw[];
        return rows.map(toDraft);
    }

    const workRows = db
        .select({
            id: works.id,
            user_id: works.user_id,
            title: works.title,
            description: works.description,
            cover: works.cover,
            created_at: works.created_at,
            updated_at: works.updated_at,
        })
        .from(works)
        .where(eq(works.user_id, userId))
        .orderBy(desc(works.updated_at), desc(works.id))
        .all();
    const published: WorkDraftMeta[] = workRows.map(toPublishedDraftMeta);

    if (options.status === "published") {
        return attachFilesToPage(published.slice(options.offset, options.offset + options.limit));
    }

    const unpublishedDrafts = (
        db
            .select()
            .from(workDrafts)
            .where(eq(workDrafts.user_id, userId))
            .orderBy(desc(workDrafts.updated_at), desc(workDrafts.id))
            .all() as unknown as WorkDraftRowRaw[]
    )
        .map(toDraft)
        .filter((d) => d.status !== "published");

    const page = [...published, ...unpublishedDrafts]
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : b.id - a.id))
        .slice(options.offset, options.offset + options.limit);
    return attachFilesToPage(page);
}

export function getWorkDraftById(id: number): WorkDraft | null {
    const row = db.select().from(workDrafts).where(eq(workDrafts.id, id)).get();
    return row ? toDraft(row) : null;
}

export function getWorkDraftOwner(id: number): number | null {
    const row = db.select({ user_id: workDrafts.user_id }).from(workDrafts).where(eq(workDrafts.id, id)).get();
    return row?.user_id ?? null;
}

export function updateWorkDraft(
    id: number,
    data: {
        title: string;
        description: string;
        cover: string;
        fileRows: { name: string; path: string; size: number }[];
    },
): { draft: WorkDraft | null; removedFiles: string[]; removedCover: string | null } {
    const old = getWorkDraftById(id);
    if (!old) return { draft: null, removedFiles: [], removedCover: null };
    const oldPaths = old.files.map((f) => f.path);
    const keptPaths = new Set(data.fileRows.map((f) => f.path));
    const removedFiles = oldPaths.filter((p) => !keptPaths.has(p));
    const oldCover = old.cover;

    db.update(workDrafts)
        .set({
            title: data.title,
            description: data.description,
            cover: data.cover,
            updated_at: new Date().toISOString(),
        })
        .where(eq(workDrafts.id, id))
        .run();
    db.delete(workDraftFiles).where(eq(workDraftFiles.draft_id, id)).run();
    for (const file of data.fileRows)
        db.insert(workDraftFiles)
            .values({ draft_id: id, ...file })
            .run();

    const removedCover = oldCover !== data.cover && oldCover.startsWith("/uploads/") ? oldCover : null;
    return { draft: getWorkDraftById(id), removedFiles, removedCover };
}

export function deleteWorkDraft(id: number): { filePaths: string[]; coverPath: string | null } {
    const draft = getWorkDraftById(id);
    const filePaths = draft ? draft.files.map((f) => f.path) : [];
    let coverPath: string | null = draft && draft.cover.startsWith("/uploads/") ? draft.cover : null;
    db.delete(workDraftFiles).where(eq(workDraftFiles.draft_id, id)).run();
    db.delete(workDrafts).where(eq(workDrafts.id, id)).run();
    if (draft?.work_id != null) {
        const deleted = deleteWork(draft.work_id);
        filePaths.push(...deleted.filePaths);
        if (deleted.coverPath) coverPath = deleted.coverPath;
    }
    return { filePaths, coverPath };
}

export function publishWorkDraft(id: number): {
    draft: WorkDraft;
    work: NonNullable<ReturnType<typeof createWork>>;
} | null {
    const draft = getWorkDraftById(id);
    if (!draft) return null;
    if (draft.status === "published" && draft.work_id != null) {
        const existing = getWorkById(draft.work_id, draft.user_id);
        if (!existing) return null;
        return { draft, work: existing };
    }
    const work = createWork(
        draft.user_id,
        draft.title,
        draft.description,
        draft.cover,
        null,
        draft.files.map((f) => ({ name: f.name, path: f.path, size: f.size })),
    );
    if (!work) return null;
    db.update(workDrafts)
        .set({ status: "published", work_id: work.id, updated_at: new Date().toISOString() })
        .where(eq(workDrafts.id, id))
        .run();
    return { draft: getWorkDraftById(id)!, work };
}

export function unpublishWorkDraft(id: number): WorkDraft | null {
    const draft = getWorkDraftById(id);
    if (!draft) return null;
    const wasPublished = draft.status === "published" && draft.work_id != null;
    db.update(workDrafts)
        .set({ status: "draft", work_id: null, updated_at: new Date().toISOString() })
        .where(eq(workDrafts.id, id))
        .run();
    if (wasPublished) {
        deleteWork(draft.work_id!);
    }
    return getWorkDraftById(id);
}
