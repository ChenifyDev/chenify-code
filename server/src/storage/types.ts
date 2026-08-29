export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    avatar: string | null;
    created_at: string;
    is_favorites_public: boolean;
    is_follows_public: boolean;
}

export interface UserPublic {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    created_at: string;
}

export interface SpaceUser extends UserPublic {
    is_favorites_public: boolean;
    is_follows_public: boolean;
}

export interface UserSummary {
    id: number;
    username: string;
    avatar: string | null;
    created_at: string;
}

export interface FollowUser extends UserSummary {
    is_following: boolean;
}

export interface PointsUser extends UserSummary {
    email: string;
    is_following: boolean;
    points: number;
    rank?: number;
}

export type CoinPeriod = "week" | "month" | "total";

export interface CoinUser extends UserSummary {
    email: string;
    is_following: boolean;
    coins: number;
    rank?: number;
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
    coins_count: number;
    is_liked: boolean;
    is_favorited: boolean;
    is_following_author: boolean;
    pinned: boolean;
}

export interface Comment {
    id: number;
    post_id: number;
    parent_id: number | null;
    content: string;
    created_at: string;
    author: UserSummary;
    post_snippet: string;
    likes_count: number;
    is_liked: boolean;
    replies: Comment[];
}

export interface SpaceCounts {
    posts: number;
    favorites: number | null;
    following: number | null;
    followers: number | null;
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

export interface PostRow {
    id: number;
    user_id: number;
    content: string;
    contentRef: string;
    created_at: string;
    username: string;
    avatar: string | null;
    comments_count: number;
    likes_count: number;
    favorites_count: number;
    coins_count: number;
    pinned: boolean;
}

export interface CommentRow {
    id: number;
    post_id: number;
    parent_id: number | null;
    content: string;
    created_at: string;
    user_id: number;
    username: string;
    avatar: string | null;
    post_snippet: string;
}

export type FollowUserRow = UserSummary & { is_following: number };

export type NotificationType = "post_comment" | "post_reply" | "post_tip";

export interface NotificationRow {
    id: number;
    user_id: number;
    actor_id: number;
    type: NotificationType;
    post_id: number | null;
    work_id: number | null;
    comment_id: number | null;
    data: string | null;
    is_read: boolean;
    created_at: string;
}

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
