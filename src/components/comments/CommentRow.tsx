import { useUserStore } from "@/stores/useUser.ts";
import { type UserSummary } from "@/lib/api";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { formatDateTime } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { CornerDownRight, Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type BaseComment<T> = {
    id: number;
    parent_id: number | null;
    replies: T[];
    author: UserSummary;
    created_at: string;
    is_liked: boolean;
    likes_count: number;
    content: string;
};

function CommentRow<T extends BaseComment<T>>({
    comment,
    parent,
    onDelete,
    onLike,
    onReply,
}: {
    comment: T;
    parent: T | undefined;
    onDelete: (commentId: number) => void;
    onLike: (comment: T) => void;
    onReply: (comment: T) => void;
}) {
    const me = useUserStore((s) => s.user);
    const isSelf = me?.id === comment.author.id;
    return (
        <div className="grid gap-1.5" id={`Tag-${comment.id}`}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link
                    to={`/users/${comment.author.id}`}
                    className="flex min-w-0 items-center gap-2 hover:text-foreground"
                >
                    <Avatar size="sm">
                        {comment.author.avatar ? (
                            <AvatarImage src={comment.author.avatar} alt={comment.author.username} />
                        ) : null}
                        <AvatarFallback>{comment.author.username.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate font-medium">{comment.author.username}</span>
                </Link>
                {parent && (
                    <div>
                        {" 回复了 "}
                        <span
                            onClick={() => document.getElementById(`Tag-${parent.id}`)?.scrollIntoView()}
                            className={"cursor-pointer"}
                        >
                            {parent.author.username}
                        </span>
                    </div>
                )}
                <span>·</span>
                <span className="shrink-0">{formatDateTime(comment.created_at)}</span>
                <button
                    type="button"
                    className={cn(
                        "ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground",
                        comment.is_liked && "text-primary",
                    )}
                    onClick={() => onLike(comment)}
                    aria-label="点赞评论"
                >
                    <Heart className={cn("size-3.5", comment.is_liked && "fill-current")} />
                    {comment.likes_count}
                </button>
                <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
                    onClick={() => onReply(comment)}
                    aria-label="回复评论"
                >
                    <CornerDownRight className="size-3.5" />
                    回复
                </button>
                {isSelf && (
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="删除评论"
                        onClick={() => onDelete(comment.id)}
                    >
                        <Trash2 />
                    </Button>
                )}
            </div>
            <p className="whitespace-pre-wrap pl-9 text-sm">{comment.content}</p>
            {comment.replies.length > 0 && (
                <div className="grid gap-3 border-l border-border pl-4">
                    {comment.replies.map((reply) => (
                        <CommentRow
                            key={reply.id}
                            comment={reply}
                            parent={comment.replies.find((comment) => comment.id === reply.parent_id)}
                            onDelete={onDelete}
                            onLike={onLike}
                            onReply={onReply}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export { CommentRow };
