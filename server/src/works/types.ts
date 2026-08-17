import type { UserSummary } from "../db/types";
import type { WorkRow } from "./schema";

export interface Work {
    id: number;
    user_id: number;
    title: string | null;
    description: string | null;
    cover: string | null;
    git_path: string | null;
    author: UserSummary;
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
}

export type WorkRowWithCounts = WorkRow & { likes_count: number; comments_count: number };

export interface WorkComment {
    id: number;
    work_id: number;
    parent_id: number | null;
    content: string;
    created_at: string;
    author: UserSummary;
    likes_count: number;
    is_liked: boolean;
    replies: WorkComment[];
}

export interface WorkCommentFlat {
    id: number;
    work_id: number;
    parent_id: number | null;
    user_id: number;
    content: string;
    created_at: string;
}
