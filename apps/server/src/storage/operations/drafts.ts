import { C } from "../collections";
import { deleteContentBlob, loadContentBlob, saveContentBlob } from "../content";
import type { BlobStore, CollectionStore } from "../store";
import type { StoredDraft, StoredDraftImage, StoredDraftTag, StoredTag } from "../rows";
import { deleteTag, getOrCreateTag, isTagReferenced } from "./tags-internal";
import {
    createPostStandalone,
    deletePostRowStandalone,
    deletePostStandalone,
    getPostByIdStandalone,
    updatePostStandalone,
} from "./posts";
import { assembleDraft } from "../mappers";
import type { Draft } from "../types";
import type { DraftsRepo } from "../plugin";

async function getDraftImages(store: CollectionStore, id: number): Promise<string[]> {
    const rows = await store.read<StoredDraftImage>(C.draftImages);
    return rows.filter((row) => row.draft_id === id).map((row) => row.path);
}

async function getDraftTags(store: CollectionStore, id: number): Promise<string[]> {
    const [rows, tags] = await Promise.all([store.read<StoredDraftTag>(C.draftTags), store.read<StoredTag>(C.tags)]);
    const tagMap = new Map(tags.map((tag) => [tag.id, tag.name]));
    return rows
        .filter((row) => row.draft_id === id)
        .map((row) => tagMap.get(row.tag_id))
        .filter((name): name is string => name != null);
}

async function toDraft(store: CollectionStore, blobStore: BlobStore, row: StoredDraft): Promise<Draft> {
    const [images, tags] = await Promise.all([getDraftImages(store, row.id), getDraftTags(store, row.id)]);
    return assembleDraft({ ...row, content: await loadContentBlob(blobStore, row.content) }, images, tags);
}

export function createDraftsRepo(store: CollectionStore, blobStore: BlobStore): DraftsRepo {
    return {
        async createDraft(userId, content, imagePaths, tagNames) {
            const contentRef = await saveContentBlob(blobStore, content);
            const draft = await store.insert<StoredDraft>(C.drafts, {
                user_id: userId,
                content: contentRef,
                status: "draft",
                post_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            for (const path of imagePaths) {
                await store.insert<StoredDraftImage>(C.draftImages, { draft_id: draft.id, path });
            }
            for (const tag of tagNames) {
                const tagId = await getOrCreateTag(store, tag);
                if (tagId == null) continue;
                const existing = await store.read<StoredDraftTag>(C.draftTags);
                if (existing.some((row) => row.draft_id === draft.id && row.tag_id === tagId)) continue;
                await store.append<StoredDraftTag>(C.draftTags, { draft_id: draft.id, tag_id: tagId });
            }
            return toDraft(store, blobStore, draft);
        },

        async listDrafts(userId, options) {
            const rows = await store.read<StoredDraft>(C.drafts);
            const filtered = rows
                .filter((row) => row.user_id === userId && (options.status == null || row.status === options.status))
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id)
                .slice(options.offset, options.offset + options.limit);
            return Promise.all(filtered.map((row) => toDraft(store, blobStore, row)));
        },

        async getDraftById(id) {
            const row = await store.getById<StoredDraft>(C.drafts, id);
            return row ? toDraft(store, blobStore, row) : null;
        },

        async getDraftByPostId(postId) {
            const rows = await store.read<StoredDraft>(C.drafts);
            const row = rows.find((r) => r.post_id === postId);
            return row ? toDraft(store, blobStore, row) : null;
        },

        async getDraftOwner(id) {
            const row = await store.getById<StoredDraft>(C.drafts, id);
            return row?.user_id ?? null;
        },

        async updateDraft(id, content, imagePaths, tagNames) {
            const draftBefore = await store.getById<StoredDraft>(C.drafts, id);
            const publishedPostId = draftBefore?.status === "published" ? draftBefore.post_id : null;
            const nextContent = await saveContentBlob(blobStore, content);
            if (draftBefore != null && draftBefore.content !== nextContent) {
                await deleteContentBlob(blobStore, draftBefore.content);
            }

            const removedImages = await getDraftImages(store, id);
            const existingTagRows = await store.read<StoredDraftTag>(C.draftTags);
            const removedTagIds = existingTagRows.filter((row) => row.draft_id === id).map((row) => row.tag_id);

            await Promise.all([
                store.updateById<StoredDraft>(C.drafts, id, { content: nextContent, updated_at: new Date().toISOString() }),
                store.deleteWhere<StoredDraftImage>(C.draftImages, (row) => row.draft_id === id),
                store.deleteWhere<StoredDraftTag>(C.draftTags, (row) => row.draft_id === id),
            ]);

            const keepTags = new Set(removedTagIds);
            for (const path of imagePaths) {
                await store.insert<StoredDraftImage>(C.draftImages, { draft_id: id, path });
            }
            for (const tag of tagNames) {
                const tagId = await getOrCreateTag(store, tag);
                if (tagId == null) continue;
                keepTags.add(tagId);
                const rows = await store.read<StoredDraftTag>(C.draftTags);
                if (rows.some((row) => row.draft_id === id && row.tag_id === tagId)) continue;
                await store.append<StoredDraftTag>(C.draftTags, { draft_id: id, tag_id: tagId });
            }

            for (const tagId of removedTagIds) {
                if (!keepTags.has(tagId) && !(await isTagReferenced(store, tagId))) await deleteTag(store, tagId);
            }

            if (publishedPostId != null) {
                await updatePostStandalone(store, blobStore, publishedPostId, content, imagePaths, tagNames);
            }

            const keepImages = new Set(imagePaths);
            const goneImages = removedImages.filter((path) => !keepImages.has(path));

            const row = await store.getById<StoredDraft>(C.drafts, id);
            return { draft: row ? await toDraft(store, blobStore, row) : null, removedImages: goneImages };
        },

        async deleteDraft(id) {
            const images = await getDraftImages(store, id);
            const row = await store.getById<StoredDraft>(C.drafts, id);
            if (row) {
                await deleteContentBlob(blobStore, row.content);
            }
            await Promise.all([
                store.deleteWhere<StoredDraftImage>(C.draftImages, (r) => r.draft_id === id),
                store.deleteWhere<StoredDraftTag>(C.draftTags, (r) => r.draft_id === id),
                store.deleteWhere<StoredDraft>(C.drafts, (r) => r.id === id),
            ]);
            if (row?.post_id != null) {
                images.push(...(await deletePostStandalone(store, blobStore, row.post_id)));
            }
            return images;
        },

        async publishDraft(id) {
            const draft = await this.getDraftById(id);
            if (!draft) return null;
            if (draft.status === "published" && draft.post_id != null) {
                return { draft, post: (await getPostByIdStandalone(store, blobStore, draft.post_id, draft.user_id))! };
            }
            const post = await createPostStandalone(store, blobStore, draft.user_id, draft.content, draft.images, draft.tags);
            if (!post) return null;
            await store.updateById<StoredDraft>(C.drafts, id, {
                status: "published",
                post_id: post.id,
                updated_at: new Date().toISOString(),
            });
            return { draft: (await this.getDraftById(id))!, post };
        },

        async unpublishDraft(id) {
            const draft = await this.getDraftById(id);
            if (!draft) return null;
            const wasPublished = draft.status === "published" && draft.post_id != null;
            await store.updateById<StoredDraft>(C.drafts, id, {
                status: "draft",
                post_id: null,
                updated_at: new Date().toISOString(),
            });
            if (wasPublished) {
                await deletePostRowStandalone(store, blobStore, draft.post_id!);
            }
            return this.getDraftById(id);
        },
    };
}
