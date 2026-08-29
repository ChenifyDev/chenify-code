import type {
    AppNotification,
    CoinPeriod,
    CoinUser,
    Comment,
    Draft,
    FollowUser,
    PointsUser,
    Post,
    SpaceUser,
    User,
    UserPublic,
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
    countSearchUsers(keyword: string): Promise<number>;
    countUsers(): Promise<number>;
}

export interface PostsRepo {
    getPostOwner(id: number): Promise<number | null>;
    createPost(userId: number, content: string, imagePaths: string[], postTagsNames: string[]): Promise<Post | null>;
    getPostById(id: number, viewerId: number | null): Promise<Post | null>;
    getPostContent(id: number): Promise<string | null>;
    listPosts(options: {
        offset: number;
        limit: number;
        tag?: string | null;
        sort?: "latest" | "hot";
        viewerId: number | null;
    }): Promise<Post[]>;
    countPosts(options: { tag?: string | null }): Promise<number>;
    listUserPosts(userId: number, options: { offset: number; limit: number; viewerId: number | null }): Promise<Post[]>;
    countUserPosts(userId: number): Promise<number>;
    listUserFavorites(
        userId: number,
        options: { offset: number; limit: number; viewerId: number | null },
    ): Promise<Post[]>;
    countUserFavorites(userId: number): Promise<number>;
    deletePost(id: number): Promise<string[]>;
    deletePostRow(id: number): Promise<void>;
    updatePostContent(id: number, content: string): Promise<Post | null>;
    setPostPinned(postId: number, pinned: boolean): Promise<Post | null>;
    searchPosts(options: { offset: number; limit: number; sort?: "latest" | "hot"; keyword: string }): Promise<Post[]>;
    countSearchPosts(options: { keyword: string }): Promise<number>;
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
    countFollowing(ownerId: number): Promise<number>;
    listFollowers(
        ownerId: number,
        viewerId: number | null,
        options: { offset: number; limit: number },
    ): Promise<FollowUser[]>;
    countFollowers(ownerId: number): Promise<number>;
}

export interface DraftsRepo {
    createDraft(userId: number, content: string, imagePaths: string[], tagNames: string[]): Promise<Draft>;
    listDrafts(
        userId: number,
        options: { offset: number; limit: number; status?: "draft" | "published" },
    ): Promise<Draft[]>;
    countDrafts(userId: number, status?: "draft" | "published"): Promise<number>;
    getDraftById(id: number): Promise<Draft | null>;
    getDraftByPostId(postId: number): Promise<Draft | null>;
    getDraftOwner(id: number): Promise<number | null>;
    updateDraft(
        id: number,
        content: string,
        imagePaths: string[],
        tagNames: string[],
    ): Promise<{ draft: Draft | null; removedImages: string[] }>;
    updateDraftContent(id: number, content: string): Promise<Draft | null>;
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
        type: "post_comment" | "post_reply" | "post_tip" | "user_tip";
        postId?: number | null;
        commentId?: number | null;
        data?: string | null;
    }): Promise<void>;
    countUnreadNotifications(userId: number): Promise<number>;
    countNotifications(userId: number): Promise<number>;
    markNotificationsRead(userId: number, ids?: number[]): Promise<void>;
    listNotifications(userId: number, options: { offset: number; limit: number }): Promise<AppNotification[]>;
    deleteNotificationsForPost(postId: number): Promise<void>;
    deleteNotificationsForComment(commentIds: number[]): Promise<void>;
}

export interface HomeRepo {
    listFollowingPosts(viewerId: number | null, options: { offset: number; limit: number }): Promise<Post[]>;
    countFollowingPosts(viewerId: number): Promise<number>;
}

export interface RankRepo {
    rankUsersByFollowers(options: { offset: number; limit: number }, viewerId?: number): Promise<FollowUser[]>;
    rankUsersByPoints(options: { offset: number; limit: number }, viewerId?: number): Promise<PointsUser[]>;
    getFollowerRank(userId: number): Promise<number>;
    getPointsRank(userId: number): Promise<number>;
}

export interface CoinsRepo {
    getBalance(userId: number): Promise<number>;
    checkIn(userId: number, now?: Date): Promise<{ granted: boolean; balance: number }>;
    listDailyCheckins(userId: number, limit?: number): Promise<string[]>;
    tipPost(
        userId: number,
        postId: number,
        postAuthorId: number,
    ): Promise<{ ok: boolean; reason?: "already_tipped" | "insufficient"; balance: number }>;
    tipUser(
        userId: number,
        recipientId: number,
        amount: number,
        now?: Date,
    ): Promise<{
        ok: boolean;
        reason?: "already_tipped" | "insufficient" | "invalid_amount" | "self_tip";
        balance: number;
        recipient_delta: number;
    }>;
    hasTipped(userId: number, postId: number): Promise<boolean>;
    rankCoins(
        options: { period: CoinPeriod; offset: number; limit: number },
        viewerId?: number,
    ): Promise<CoinUser[]>;
    getCoinRank(userId: number, period: CoinPeriod): Promise<number>;
    getPostCoinsReceived(postId: number): Promise<number>;
    getCoinsReceivedTotal(userId: number): Promise<number>;
}

export interface StoragePlugin {
    readonly name: string;
    readonly store: CollectionStore;
    readonly blobs: BlobStore;
}
