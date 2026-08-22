import type {
    AppNotification,
    Comment,
    Draft,
    FollowUser,
    PointsUser,
    Post,
    SpaceUser,
    User,
    UserPublic,
    Work,
    WorkComment,
} from "./types";
import type { BlobStore, CollectionStore } from "./store";

export interface UsersRepo {
    createUser(username: string, email: string, passwordHash: string, avatar: string | null): Promise<UserPublic>;
    findUserByEmail(email: string): Promise<User | null>;
    findUserByUsername(username: string): Promise<User | null>;
    findUserByUsernameOrEmail(login: string): Promise<User | null>;
    findUserById(id: number): Promise<UserPublic | null>;
    getSpaceUser(id: number): Promise<SpaceUser | null>;
    userExists(id: number): Promise<boolean>;
    getSpaceCounts(userId: number): Promise<{ posts: number; favorites: number; following: number; followers: number }>;
    updatePrivacy(
        userId: number,
        isFavoritesPublic: boolean | undefined,
        isFollowsPublic: boolean | undefined,
    ): Promise<void>;
    updateUserProfile(
        userId: number,
        changes: { username?: string; avatar?: string | null },
    ): Promise<UserPublic | null>;
    searchUsers(
        options: { offset: number; limit: number; keyword: string },
        viewerId: number | null,
    ): Promise<FollowUser[]>;
}

export interface PostsRepo {
    getPostOwner(id: number): Promise<number | null>;
    createPost(userId: number, content: string, imagePaths: string[], postTagsNames: string[]): Promise<Post | null>;
    getPostById(id: number, viewerId: number | null): Promise<Post | null>;
    listPosts(options: {
        offset: number;
        limit: number;
        tag?: string | null;
        sort?: "latest" | "hot";
        viewerId: number | null;
    }): Promise<Post[]>;
    listUserPosts(userId: number, options: { offset: number; limit: number; viewerId: number | null }): Promise<Post[]>;
    listUserFavorites(
        userId: number,
        options: { offset: number; limit: number; viewerId: number | null },
    ): Promise<Post[]>;
    deletePost(id: number): Promise<string[]>;
    deletePostRow(id: number): Promise<void>;
    searchPosts(options: { offset: number; limit: number; sort?: "latest" | "hot"; keyword: string }): Promise<Post[]>;
}

export interface CommentsRepo {
    createComment(userId: number, postId: number, content: string, parentId?: number | null): Promise<Comment | null>;
    listComments(
        postId: number,
        viewerId: number | null,
        options: { offset: number; limit: number },
    ): Promise<Comment[]>;
    getCommentOwner(id: number): Promise<number | null>;
    commentBelongsToPost(commentId: number, postId: number): Promise<boolean>;
    toggleCommentLike(userId: number, commentId: number): Promise<{ liked: boolean; likes_count: number }>;
    unlikeComment(userId: number, commentId: number): Promise<{ liked: boolean; likes_count: number }>;
    deleteComment(id: number): Promise<boolean>;
}

export interface LikesRepo {
    toggleLike(userId: number, postId: number): Promise<{ liked: boolean; likes_count: number }>;
    unlikePost(userId: number, postId: number): Promise<{ liked: boolean; likes_count: number }>;
    isLiked(userId: number, postId: number): Promise<boolean>;
}

export interface FavoritesRepo {
    toggleFavorite(userId: number, postId: number): Promise<{ favorited: boolean; favorites_count: number }>;
    unfavoritePost(userId: number, postId: number): Promise<{ favorited: boolean; favorites_count: number }>;
    isFavorited(userId: number, postId: number): Promise<boolean>;
}

export interface FollowsRepo {
    toggleFollow(followerId: number, followingId: number): Promise<{ following: boolean; followers_count: number }>;
    unfollowUser(followerId: number, followingId: number): Promise<{ following: boolean; followers_count: number }>;
    isFollowing(followerId: number, followingId: number): Promise<boolean>;
    listFollowing(
        ownerId: number,
        viewerId: number | null,
        options: { offset: number; limit: number },
    ): Promise<FollowUser[]>;
    listFollowers(
        ownerId: number,
        viewerId: number | null,
        options: { offset: number; limit: number },
    ): Promise<FollowUser[]>;
}

export interface DraftsRepo {
    createDraft(userId: number, content: string, imagePaths: string[], tagNames: string[]): Promise<Draft>;
    listDrafts(
        userId: number,
        options: { offset: number; limit: number; status?: "draft" | "published" },
    ): Promise<Draft[]>;
    getDraftById(id: number): Promise<Draft | null>;
    getDraftByPostId(postId: number): Promise<Draft | null>;
    getDraftOwner(id: number): Promise<number | null>;
    updateDraft(
        id: number,
        content: string,
        imagePaths: string[],
        tagNames: string[],
    ): Promise<{ draft: Draft | null; removedImages: string[] }>;
    deleteDraft(id: number): Promise<string[]>;
    publishDraft(id: number): Promise<{ draft: Draft; post: Post } | null>;
    unpublishDraft(id: number): Promise<Draft | null>;
}

export interface TagsRepo {
    listTags(): Promise<string[]>;
}

export interface NotificationsRepo {
    createNotification(input: {
        userId: number;
        actorId: number;
        type: "post_comment" | "post_reply";
        postId?: number | null;
        commentId?: number | null;
    }): Promise<void>;
    countUnreadNotifications(userId: number): Promise<number>;
    markNotificationsRead(userId: number, ids?: number[]): Promise<void>;
    listNotifications(userId: number, options: { offset: number; limit: number }): Promise<AppNotification[]>;
    deleteNotificationsForPost(postId: number): Promise<void>;
    deleteNotificationsForComment(commentIds: number[]): Promise<void>;
}

export interface RankRepo {
    rankUsersByFollowers(options: { offset: number; limit: number }, viewerId?: number): Promise<FollowUser[]>;
    rankUsersByPoints(options: { offset: number; limit: number }, viewerId?: number): Promise<PointsUser[]>;
    getFollowerRank(userId: number): Promise<number>;
    getPointsRank(userId: number): Promise<number>;
}

export interface WorksRepo {
    getWorkOwner(workId: number): Promise<number | null>;
    createWork(
        userId: number,
        data: { title?: string | null; description?: string | null; cover?: string | null; git_path?: string | null },
    ): Promise<Work | null>;
    getWorkById(id: number, viewerId: number | null): Promise<Work | null>;
    listWorks(options: {
        offset: number;
        limit: number;
        viewerId: number | null;
        sort?: "latest" | "hot";
    }): Promise<Work[]>;
    updateWork(
        id: number,
        data: { title?: string | null; description?: string | null; cover?: string | null; git_path?: string | null },
    ): Promise<Work | null>;
    deleteWork(id: number): Promise<{ coverPath: string | null }>;
    toggleWorkLike(userId: number, workId: number): Promise<{ liked: boolean; likes_count: number }>;
    unlikeWork(userId: number, workId: number): Promise<{ liked: boolean; likes_count: number }>;
    searchWorks(options: { offset: number; limit: number; keyword: string; sort?: "latest" | "hot" }): Promise<Work[]>;
}

export interface WorksCommentsRepo {
    createWorkComment(
        userId: number,
        workId: number,
        content: string,
        parentId?: number | null,
    ): Promise<WorkComment | null>;
    listWorkComments(
        workId: number,
        viewerId: number | null,
        options: { offset: number; limit: number },
    ): Promise<WorkComment[]>;
    getWorkCommentOwner(id: number): Promise<number | null>;
    workCommentBelongsToWork(commentId: number, workId: number): Promise<boolean>;
    toggleWorkCommentLike(userId: number, commentId: number): Promise<{ liked: boolean; likes_count: number }>;
    unlikeWorkComment(userId: number, commentId: number): Promise<{ liked: boolean; likes_count: number }>;
    deleteWorkComment(id: number): Promise<boolean>;
}

export interface StoragePlugin {
    readonly name: string;
    readonly store: CollectionStore;
    readonly blobs: BlobStore;
}
