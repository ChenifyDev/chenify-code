export interface UserSummary {
    id: number;
    username: string;
    avatar: string | null;
    created_at: string;
}

export interface WorkFile {
    id: number;
    name: string;
    path: string;
    size: number;
}

export interface WorkSummary {
    id: number;
    title: string;
    description: string;
    cover: string;
    parent_id: number | null;
    created_at: string;
    updated_at: string;
    author: UserSummary;
    files_count: number;
    comments_count: number;
    likes_count: number;
    favorites_count: number;
    is_liked: boolean;
    is_favorited: boolean;
}

export interface WorkDetail extends WorkSummary {
    files: WorkFile[];
}

export interface WorkComment {
    id: number;
    work_id: number;
    content: string;
    created_at: string;
    author: UserSummary;
}

export interface WorkRow {
    id: number;
    user_id: number;
    title: string;
    description: string;
    cover: string;
    parent_id: number | null;
    created_at: string;
    updated_at: string;
    comments_count: number;
    likes_count: number;
    favorites_count: number;
    files_count: number;
}