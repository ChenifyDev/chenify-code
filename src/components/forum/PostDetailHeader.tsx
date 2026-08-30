import { Pencil, Trash2, UserCheck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

import { UserAvatar } from "@/components/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { Post } from "@/lib/api";
import { formatDateTime } from "@/lib/format.ts";

type PostDetailHeaderProps = {
    post: Post;
    isAuthor: boolean;
    isMe: boolean;
    draftId: number | null;
    following: boolean;
    followBusy: boolean;
    deleting: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onFollow: () => void;
};

export function PostDetailHeader({
    post,
    isAuthor,
    isMe,
    draftId,
    following,
    followBusy,
    deleting,
    onEdit,
    onDelete,
    onFollow,
}: PostDetailHeaderProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
                <Link
                    to={`/users/${post.author.id}`}
                    className="flex min-w-0 items-center gap-2 hover:text-foreground"
                >
                    <UserAvatar user={post.author} />
                    <span className="truncate text-sm font-medium">{post.author.username}</span>
                </Link>
                <span className="text-xs text-muted-foreground">· {formatDateTime(post.created_at)}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {isAuthor ? (
                    <div className="flex shrink-0 items-center gap-2">
                        {draftId != null && (
                            <Button variant="outline" size="sm" onClick={onEdit}>
                                <Pencil />
                                编辑
                            </Button>
                        )}
                        <Button variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
                            <Trash2 />
                            {deleting ? "删除中…" : "删除帖子"}
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="sm"
                        variant={following ? "outline" : "default"}
                        disabled={followBusy}
                        onClick={onFollow}
                    >
                        {following ? <UserCheck /> : <UserPlus />}
                        {following ? "已关注" : isMe ? "关注" : "登录后关注"}
                    </Button>
                )}
            </div>
        </div>
    );
}