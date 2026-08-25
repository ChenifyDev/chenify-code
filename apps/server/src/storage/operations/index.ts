import type { BlobStore, CollectionStore } from "../store";
import type {
    CommentsRepo,
    DraftsRepo,
    FavoritesRepo,
    FollowsRepo,
    HomeRepo,
    LikesRepo,
    NotificationsRepo,
    PostsRepo,
    RankRepo,
    TagsRepo,
    UsersRepo,
} from "../plugin";
import { createUsersRepo } from "./users";
import { createPostsRepo } from "./posts";
import { createCommentsRepo } from "./comments";
import { createLikesRepo } from "./likes";
import { createFavoritesRepo } from "./favorites";
import { createFollowsRepo } from "./follows";
import { createHomeRepo } from "./home";
import { createDraftsRepo } from "./drafts";
import { createTagsRepo } from "./tags";
import { createNotificationsRepo } from "./notifications";
import { createRankRepo } from "./rank";

export interface Operations {
    users: UsersRepo;
    posts: PostsRepo;
    comments: CommentsRepo;
    likes: LikesRepo;
    favorites: FavoritesRepo;
    follows: FollowsRepo;
    home: HomeRepo;
    drafts: DraftsRepo;
    tags: TagsRepo;
    notifications: NotificationsRepo;
    rank: RankRepo;
}

export function createOperations(store: CollectionStore, blobs: BlobStore): Operations {
    return {
        users: createUsersRepo(store),
        posts: createPostsRepo(store, blobs),
        comments: createCommentsRepo(store, blobs),
        likes: createLikesRepo(store),
        favorites: createFavoritesRepo(store),
        follows: createFollowsRepo(store),
        home: createHomeRepo(store, blobs),
        drafts: createDraftsRepo(store, blobs),
        tags: createTagsRepo(store),
        notifications: createNotificationsRepo(store),
        rank: createRankRepo(store),
    };
}
