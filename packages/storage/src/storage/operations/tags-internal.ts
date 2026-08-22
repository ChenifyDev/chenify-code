import { C } from "../collections";
import type { CollectionStore } from "../store";
import type { StoredDraftTag, StoredPostTag, StoredTag } from "../rows";

export async function getOrCreateTag(store: CollectionStore, name: string): Promise<number | undefined> {
    const tags = await store.read<StoredTag>(C.tags);
    const existing = tags.find((tag) => tag.name === name);
    if (existing) return existing.id;
    const created = await store.insert<StoredTag>(C.tags, { name });
    return created.id;
}

export async function isTagReferenced(store: CollectionStore, tagId: number): Promise<boolean> {
    const [postTags, draftTags] = await Promise.all([
        store.read<StoredPostTag>(C.postTags),
        store.read<StoredDraftTag>(C.draftTags),
    ]);
    return postTags.some((row) => row.tag_id === tagId) || draftTags.some((row) => row.tag_id === tagId);
}

export async function deleteTag(store: CollectionStore, tagId: number): Promise<void> {
    await store.deleteWhere<StoredTag>(C.tags, (tag) => tag.id === tagId);
}

export async function listTagsRaw(store: CollectionStore): Promise<StoredTag[]> {
    const tags = await store.read<StoredTag>(C.tags);
    return [...tags].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
