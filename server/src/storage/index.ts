import type { BlobStore, CollectionStore } from "./store";
import type {
    CommentsRepo,
    DraftsRepo,
    FavoritesRepo,
    FollowsRepo,
    LikesRepo,
    NotificationsRepo,
    PostsRepo,
    RankRepo,
    TagsRepo,
    UsersRepo,
    WorksCommentsRepo,
    WorksRepo,
} from "./plugin";
import type { StoragePlugin } from "./plugin";
import { createOperations } from "./operations";
import { sqliteStoragePlugin } from "./driver/sqlite";
import { neonStoragePlugin } from "./driver/neon";

export interface Storage {
    readonly name: string;
    readonly store: CollectionStore;
    readonly blobs: BlobStore;
    readonly users: UsersRepo;
    readonly posts: PostsRepo;
    readonly comments: CommentsRepo;
    readonly likes: LikesRepo;
    readonly favorites: FavoritesRepo;
    readonly follows: FollowsRepo;
    readonly drafts: DraftsRepo;
    readonly tags: TagsRepo;
    readonly notifications: NotificationsRepo;
    readonly rank: RankRepo;
    readonly works: WorksRepo;
    readonly worksComments: WorksCommentsRepo;
}

let storage: Storage | null = null;

export function getStorage(): Storage {
    if (storage) return storage;
    let plugin: StoragePlugin;
    const driver = process.env.STORAGE_DRIVER ?? "sqlite";
    switch (driver) {
        case "neon":
            plugin = neonStoragePlugin();
            break;
        case "sqlite":
        default:
            plugin = sqliteStoragePlugin();
            break;
    }
    storage = {
        name: plugin.name,
        store: plugin.store,
        blobs: plugin.blobs,
        ...createOperations(plugin.store),
    };
    return storage;
}

export type * from "./types";
export type * from "./plugin";
export { toPublicUser } from "./mappers";
