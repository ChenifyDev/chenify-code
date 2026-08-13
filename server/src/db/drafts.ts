import { and, desc, eq } from "drizzle-orm";
import { db } from "./client";
import { draftImages, draftTags, drafts, tags, type DraftRowRaw as DraftRow } from "./schema";
import { deletePost, deletePostRow, createPost, getPostById } from "./posts";
import { getOrCreateTag, isTagReferenced, deleteTag } from "./tags";
import type { Draft, Post } from "./types";

const draftCols = {
    id: drafts.id,
    user_id: drafts.user_id,
    content: drafts.content,
    status: drafts.status,
    post_id: drafts.post_id,
    created_at: drafts.created_at,
    updated_at: drafts.updated_at,
} as const;

function getDraftImages(id: number): string[] {
    return db
        .select({ path: draftImages.path })
        .from(draftImages)
        .where(eq(draftImages.draft_id, id))
        .all()
        .map((row) => row.path);
}

function getDraftTags(id: number): string[] {
    return db
        .select({ name: tags.name })
        .from(draftTags)
        .innerJoin(tags, eq(tags.id, draftTags.tag_id))
        .where(eq(draftTags.draft_id, id))
        .all()
        .map((row) => row.name);
}

function toDraft(row: DraftRow): Draft {
    return {
        id: row.id,
        content: row.content,
        user_id: row.user_id,
        status: row.status,
        post_id: row.post_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        images: getDraftImages(row.id),
        tags: getDraftTags(row.id),
    };
}

export function createDraft(userId: number, content: string, imagePaths: string[], tagNames: string[]): Draft {
    const draft = db.insert(drafts).values({ user_id: userId, content }).returning().get();
    for (const path of imagePaths) db.insert(draftImages).values({ draft_id: draft.id, path }).run();
    for (const tag of tagNames) {
        const tagId = getOrCreateTag(tag);
        if (tagId != null)
            db.insert(draftTags).values({ draft_id: draft.id, tag_id: tagId }).onConflictDoNothing().run();
    }
    return toDraft(draft);
}

export function listDrafts(
    userId: number,
    options: { offset: number; limit: number; status?: "draft" | "published" },
): Draft[] {
    const query = db.select(draftCols).from(drafts);
    const where = options.status
        ? and(eq(drafts.user_id, userId), eq(drafts.status, options.status))
        : eq(drafts.user_id, userId);
    const rows = query
        .where(where)
        .orderBy(desc(drafts.updated_at), desc(drafts.id))
        .limit(options.limit)
        .offset(options.offset)
        .all() as DraftRow[];
    return rows.map(toDraft);
}

export function getDraftById(id: number): Draft | null {
    const row = db.select(draftCols).from(drafts).where(eq(drafts.id, id)).get() as DraftRow | undefined;
    return row ? toDraft(row) : null;
}

export function getDraftOwner(id: number): number | null {
    const row = db.select({ user_id: drafts.user_id }).from(drafts).where(eq(drafts.id, id)).get();
    return row?.user_id ?? null;
}

export function updateDraft(
    id: number,
    content: string,
    imagePaths: string[],
    tagNames: string[],
): { draft: Draft | null; removedImages: string[] } {
    const removedImages = getDraftImages(id);
    const removedTagIds = db
        .select({ tag_id: draftTags.tag_id })
        .from(draftTags)
        .where(eq(draftTags.draft_id, id))
        .all()
        .map((row) => row.tag_id);

    db.update(drafts).set({ content, updated_at: new Date().toISOString() }).where(eq(drafts.id, id)).run();
    db.delete(draftImages).where(eq(draftImages.draft_id, id)).run();
    db.delete(draftTags).where(eq(draftTags.draft_id, id)).run();

    const keepTags = new Set(removedTagIds);
    for (const path of imagePaths) db.insert(draftImages).values({ draft_id: id, path }).run();
    for (const tag of tagNames) {
        const tagId = getOrCreateTag(tag);
        if (tagId != null) {
            keepTags.add(tagId);
            db.insert(draftTags).values({ draft_id: id, tag_id: tagId }).onConflictDoNothing().run();
        }
    }

    for (const tagId of removedTagIds) {
        if (!keepTags.has(tagId) && !isTagReferenced(tagId)) deleteTag(tagId);
    }

    const keepImages = new Set(imagePaths);
    const goneImages = removedImages.filter((path) => !keepImages.has(path));

    const row = db.select(draftCols).from(drafts).where(eq(drafts.id, id)).get() as DraftRow | undefined;
    return { draft: row ? toDraft(row) : null, removedImages: goneImages };
}

export function deleteDraft(id: number): string[] {
    const images = getDraftImages(id);
    const row = db.select(draftCols).from(drafts).where(eq(drafts.id, id)).get() as DraftRow | undefined;
    db.delete(draftImages).where(eq(draftImages.draft_id, id)).run();
    db.delete(draftTags).where(eq(draftTags.draft_id, id)).run();
    db.delete(drafts).where(eq(drafts.id, id)).run();
    if (row?.post_id != null) {
        images.push(...deletePost(row.post_id));
    }
    return images;
}

export function publishDraft(id: number): { draft: Draft; post: Post } | null {
    const draft = getDraftById(id);
    if (!draft) return null;
    if (draft.status === "published" && draft.post_id != null) {
        return { draft, post: getPostById(draft.post_id, draft.user_id)! };
    }
    const post = createPost(draft.user_id, draft.content, draft.images, draft.tags);
    if (!post) return null;
    db.update(drafts)
        .set({ status: "published", post_id: post.id, updated_at: new Date().toISOString() })
        .where(eq(drafts.id, id))
        .run();
    return { draft: getDraftById(id)!, post };
}

export function unpublishDraft(id: number): Draft | null {
    const draft = getDraftById(id);
    if (!draft) return null;
    const wasPublished = draft.status === "published" && draft.post_id != null;
    db.update(drafts)
        .set({ status: "draft", post_id: null, updated_at: new Date().toISOString() })
        .where(eq(drafts.id, id))
        .run();
    if (wasPublished) {
        deletePostRow(draft.post_id!);
    }
    return getDraftById(id);
}
