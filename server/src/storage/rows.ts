export interface StoredUser {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    avatar: string | null;
    created_at: string;
    is_favorites_public: boolean;
    is_follows_public: boolean;
}

export interface StoredPost {
    id: number;
    user_id: number;
    content: string;
    created_at: string;
    pinned: boolean;
}

export interface StoredPostImage {
    id: number;
    post_id: number;
    path: string;
}

export interface StoredTag {
    id: number;
    name: string;
}

export interface StoredPostTag {
    post_id: number;
    tag_id: number;
}

export interface StoredFavorite {
    id: number;
    user_id: number;
    post_id: number;
    created_at: string;
}

export interface StoredLike {
    id: number;
    user_id: number;
    post_id: number;
    created_at: string;
}

export interface StoredComment {
    id: number;
    post_id: number;
    user_id: number;
    parent_id: number | null;
    content: string;
    created_at: string;
}

export interface StoredCommentLike {
    id: number;
    comment_id: number;
    user_id: number;
    created_at: string;
}

export interface StoredFollow {
    follower_id: number;
    following_id: number;
    created_at: string;
}

export interface StoredNotification {
    id: number;
    user_id: number;
    actor_id: number;
    type: "post_comment" | "post_reply" | "post_tip" | "user_tip";
    post_id: number | null;
    work_id: number | null;
    comment_id: number | null;
    data: string | null;
    is_read: boolean;
    created_at: string;
}

export interface StoredDraft {
    id: number;
    user_id: number;
    content: string;
    status: "draft" | "published";
    post_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface StoredDraftImage {
    id: number;
    draft_id: number;
    path: string;
}

export interface StoredDraftTag {
    draft_id: number;
    tag_id: number;
}

export interface StoredWork {
    id: number;
    user_id: number;
    title: string | null;
    description: string | null;
    cover: string | null;
    git_path: string | null;
}

export interface StoredWorkLike {
    id: number;
    user_id: number;
    work_id: number;
    created_at: string;
}

export interface StoredWorkComment {
    id: number;
    work_id: number;
    user_id: number;
    parent_id: number | null;
    content: string;
    created_at: string;
}

export interface StoredWorkCommentLike {
    id: number;
    comment_id: number;
    user_id: number;
    created_at: string;
}

export type CoinTransactionType = "daily" | "tip_out" | "tip_in";

export interface StoredCoinTransaction {
    id: number;
    user_id: number;
    post_id: number | null;
    to_user_id: number | null;
    type: CoinTransactionType;
    amount: number;
    reward_date: string | null;
    created_at: string;
}
