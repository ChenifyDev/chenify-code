import type { BlobStore, CollectionStore } from "../store";
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
} from "../plugin";
import { createUsersRepo } from "./users";
import { createPostsRepo } from "./posts";
import { createCommentsRepo } from "./comments";
import { createLikesRepo } from "./likes";
import { createFavoritesRepo } from "./favorites";
import { createFollowsRepo } from "./follows";
import { createDraftsRepo } from "./drafts";
import { createTagsRepo } from "./tags";
import { createNotificationsRepo } from "./notifications";
import { createRankRepo } from "./rank";
import { createWorksRepo } from "./works";
import { createWorksCommentsRepo } from "./works-comments";

export interface Operations {
    users: UsersRepo;
    posts: PostsRepo;
    comments: CommentsRepo;
    likes: LikesRepo;
    favorites: FavoritesRepo;
    follows: FollowsRepo;
    drafts: DraftsRepo;
    tags: TagsRepo;
    notifications: NotificationsRepo;
    rank: RankRepo;
    works: WorksRepo;
    worksComments: WorksCommentsRepo;
}

export function createOperations(store: CollectionStore, blobs: BlobStore): Operations {
    return {
        users: createUsersRepo(store),
        posts: createPostsRepo(store, blobs),
        comments: createCommentsRepo(store, blobs),
        likes: createLikesRepo(store),
        favorites: createFavoritesRepo(store),
        follows: createFollowsRepo(store),
        drafts: createDraftsRepo(store, blobs),
        tags: createTagsRepo(store),
        notifications: createNotificationsRepo(store),
        rank: createRankRepo(store),
        works: createWorksRepo(store),
        worksComments: createWorksCommentsRepo(store),
    };
}
