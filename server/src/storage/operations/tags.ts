import type { CollectionStore } from "../store";
import type { TagsRepo } from "../plugin";
import { listTagsRaw } from "./tags-internal";

export function createTagsRepo(store: CollectionStore): TagsRepo {
    return {
        async listTags() {
            const tags = await listTagsRaw(store);
            return tags.map((tag) => tag.name);
        },
    };
}
