import type {
    AppNotification,
    Comment,
    CommentRow,
    Draft,
    FollowUser,
    NotificationRow,
    Post,
    PostRow,
    User,
    UserPublic,
    UserSummary,
} from "./types";

export function toPublicUser(user: User): UserPublic {
    const { password_hash: _passwordHash, ...publicUser } = user;
    return publicUser;
}

export function snippet(text: string, length = 200): string {
    return text.slice(0, length);
}

export function heatPost(likesCount: number, favoritesCount: number, commentsCount: number, createdAt: string): number {
    const hours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
    return (likesCount * 3 + favoritesCount * 4 + commentsCount * 5 + 1) / (1 + Math.log(1 + hours));
}

export function heatWork(likesCount: number, commentsCount: number): number {
    return likesCount * 3 + commentsCount * 5 + 1;
}

export interface PostHydrationContext {
    images: Map<number, string[]>;
    tags: Map<number, string[]>;
    favoritedIds: Set<number>;
    likedIds: Set<number>;
    followedAuthorIds: Set<number>;
}

export function buildPosts(rows: PostRow[], ctx: PostHydrationContext): Post[] {
    return rows.map((row) => ({
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        author: { id: row.user_id, username: row.username, avatar: row.avatar, created_at: "" } satisfies UserSummary,
        images: ctx.images.get(row.id) ?? [],
        tags: ctx.tags.get(row.id) ?? [],
        comments_count: row.comments_count,
        likes_count: row.likes_count,
        favorites_count: row.favorites_count,
        is_liked: ctx.likedIds.has(row.id),
        is_favorited: ctx.favoritedIds.has(row.id),
        is_following_author: ctx.followedAuthorIds.has(row.user_id),
        pinned: row.pinned,
    }));
}

export interface DraftRowLike {
    id: number;
    user_id: number;
    content: string;
    status: "draft" | "published";
    post_id: number | null;
    created_at: string;
    updated_at: string;
}

export function assembleDraft(row: DraftRowLike, images: string[], tags: string[]): Draft {
    return {
        id: row.id,
        content: row.content,
        user_id: row.user_id,
        status: row.status,
        post_id: row.post_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        images,
        tags,
    };
}

export interface WorkHydrationContext {
    authors: Map<number, UserSummary>;
    likedIds: Set<number>;
}

export interface NotificationHydrationContext {
    actors: Map<number, UserSummary>;
    postSnippets: Map<number, string>;
    replyTo: Map<number, string>;
    commentContents: Map<number, string>;
}

export function buildNotifications(rows: NotificationRow[], ctx: NotificationHydrationContext): AppNotification[] {
    return rows.map((row) => {
        const replyCommentId = row.comment_id ?? 0;
        return {
            id: row.id,
            type: row.type,
            actor: ctx.actors.get(row.actor_id) ?? {
                id: row.actor_id,
                username: "未知用户",
                avatar: null,
                created_at: "",
            },
            is_read: row.is_read,
            created_at: row.created_at,
            post_id: row.post_id,
            work_id: row.work_id,
            comment_id: row.comment_id,
            snippet: row.post_id != null ? (ctx.postSnippets.get(row.post_id) ?? "") : "",
            reply_to: ctx.replyTo.get(replyCommentId) ?? null,
            comment: row.comment_id != null ? (ctx.commentContents.get(row.comment_id) ?? "") : "",
        };
    });
}

export interface SearchUserRow {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    created_at: string;
    followers: number;
    is_following: boolean;
}

export function rankSearchUsers(rows: SearchUserRow[], options: { offset: number; limit: number }): FollowUser[] {
    const scored = rows
        .map((row) => ({
            ...row,
            score: row.followers * 3,
        }))
        .sort((a, b) => b.score - a.score || b.created_at.localeCompare(a.created_at))
        .slice(options.offset, options.offset + options.limit);

    return scored.map(({ score: _score, ...user }) => user);
}

export type CommentNode = CommentRow & { author: UserSummary; likes_count: number; is_liked: boolean };

export function toCommentNode(node: CommentNode): Comment {
    return {
        id: node.id,
        post_id: node.post_id,
        parent_id: node.parent_id,
        content: node.content,
        created_at: node.created_at,
        author: node.author,
        post_snippet: node.post_snippet,
        likes_count: node.likes_count,
        is_liked: node.is_liked,
        replies: [],
    };
}

function treeIndex<T extends { id: number; parent_id: number | null; created_at: string }>(base: T[]) {
    const roots = base.filter((c) => c.parent_id == null);
    const childrenMap = new Map<number, T[]>();
    for (const c of base) {
        if (c.parent_id == null) continue;
        const arr = childrenMap.get(c.parent_id) ?? [];
        arr.push(c);
        childrenMap.set(c.parent_id, arr);
    }
    const descendants = new Map<number, T[]>();
    const collect = (rootId: number): T[] => {
        const cached = descendants.get(rootId);
        if (cached) return cached;
        const out: T[] = [];
        const queue = [rootId];
        while (queue.length > 0) {
            const pid = queue.shift()!;
            const kids = childrenMap.get(pid) ?? [];
            for (const kid of kids) {
                out.push(kid);
                queue.push(kid.id);
            }
        }
        out.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
        descendants.set(rootId, out);
        return out;
    };
    return { roots, descendants, collect };
}

export function treePageRows<T extends { id: number; parent_id: number | null; created_at: string }>(
    base: T[],
    options: { offset: number; limit: number },
): T[] {
    const { roots, collect } = treeIndex(base);
    return roots.slice(options.offset, options.offset + options.limit).flatMap((root) => [root, ...collect(root.id)]);
}

function nestThread<T extends { id: number; parent_id: number | null; created_at: string }, N extends { replies: N[] }>(
    base: T[],
    options: { offset: number; limit: number },
    make: (t: T) => N,
): N[] {
    const { roots, collect } = treeIndex(base);
    const pagedRoots = roots.slice(options.offset, options.offset + options.limit);
    return pagedRoots.map((root) => ({
        ...make(root),
        replies: collect(root.id).map(make),
    }));
}

export function buildCommentTree(rows: CommentNode[], options: { offset: number; limit: number }): Comment[] {
    return nestThread(rows, options, toCommentNode);
}
