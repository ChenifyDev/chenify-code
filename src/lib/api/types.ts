export interface UserPublic {
    id: number;
    username: string;
    email: string;
    avatar: string | undefined;
    created_at: string;
}

export interface UserSummary {
    id: number;
    username: string;
    avatar: string | undefined;
    created_at: string;
}

export interface Post {
    id: number;
    content: string;
    created_at: string;
    author: UserSummary;
    images: string[];
    tags: string[];
    comments_count: number;
    likes_count: number;
    favorites_count: number;
    // 收到的硬币总数，服务端按 0.1 枚为一"分"存储；展示处需换算（见 PostCard *10）
    coins_count: number;
    is_liked: boolean;
    is_favorited: boolean;
    is_following_author: boolean;
    pinned: boolean;
}

export interface PostComment {
    id: number;
    post_id: number;
    parent_id: number | null;
    content: string;
    created_at: string;
    author: UserSummary;
    post_snippet: string;
    likes_count: number;
    is_liked: boolean;
    replies: PostComment[];
}

export interface SpaceUser extends UserPublic {
    is_favorites_public: boolean;
    is_follows_public: boolean;
}

export interface SpaceCounts {
    posts: number;
    works: number;
    favorites: number | null;
    following: number | null;
    followers: number | null;
    coins: number;
}

export interface SpaceRelation {
    is_following: boolean;
    is_followed_by: boolean;
}

export interface SpaceSkeleton {
    user: SpaceUser;
    counts: SpaceCounts;
    relation: SpaceRelation | null;
}

export interface FollowUser extends UserSummary {
    is_following: boolean;
    email: string;
    followers: number;
    rank?: number;
}

export interface PointsUser extends FollowUser {
    points: number;
}

export type CoinPeriod = "week" | "month" | "total";

export interface CoinUser extends UserSummary {
    email: string;
    coins: number;
    is_following: boolean;
    rank?: number;
}

export interface Draft {
    id: number;
    content: string;
    user_id: number;
    status: "draft" | "published";
    post_id: number | null;
    created_at: string;
    updated_at: string;
    images: string[];
    tags: string[];
}

/**
 * 服务端分页返回的统一形状。
 * 注意：个人空间列表（getSpaceFavorites/getSpaceFollowing/getSpaceFollowers）返回的是
 * 结构相近但多一个 hidden 字段的内联形状，用于"该列表被设为私密"，请在对应 fetcher 处处理。
 */
export type Paginated<T> = {
    items: T[];
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
};

export type NotificationType = "post_comment" | "post_reply" | "work_comment" | "work_reply" | "post_tip" | "user_tip";

export interface AppNotification {
    id: number;
    type: NotificationType;
    actor: UserSummary;
    is_read: boolean;
    created_at: string;
    post_id: number | null;
    work_id: number | null;
    comment_id: number | null;
    data: string | null;
    snippet: string;
    reply_to: string | null;
    comment: string;
}