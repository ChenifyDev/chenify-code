import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CommentRow } from "@/components/comments/CommentRow.tsx";
import type { UserSummary } from "@/lib/api.ts";
import { Loader2 } from "lucide-react";

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

export default function CommentList<T extends BaseComment<T>>({
    commentsLoading,
    commentError,
    commentsLoadingMore,
    comments,
    handleDeleteComment,
    setReplyTo,
    handleLikeComment,
    hasMoreComments,
    loadComments,
}: {
    commentsLoading: boolean;
    hasMoreComments: boolean;
    commentsLoadingMore: boolean;
    commentError: string | null;
    comments: T[];
    handleDeleteComment: (commentId: number) => Promise<void>;
    setReplyTo: (value: T | null) => void;
    handleLikeComment: (comment: T) => Promise<void>;
    loadComments: (reset?: boolean) => Promise<void>;
}) {
    return (
        <div className="grid gap-4">
            {commentsLoading ? (
                <div className="grid gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="grid gap-1.5">
                            <div className="flex items-center gap-2">
                                <Skeleton className="size-6 rounded-full" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-3 w-2/3" />
                        </div>
                    ))}
                </div>
            ) : commentError ? (
                <p className="text-sm text-muted-foreground">{commentError}</p>
            ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">还没有评论，来抢沙发吧。</p>
            ) : (
                comments.map((comment) => (
                    <CommentRow
                        key={comment.id}
                        comment={comment}
                        parent={undefined}
                        onDelete={handleDeleteComment}
                        onLike={handleLikeComment}
                        onReply={setReplyTo}
                    />
                ))
            )}
            {hasMoreComments && !commentsLoading && (
                <Button
                    variant="outline"
                    className="w-full"
                    disabled={commentsLoadingMore}
                    onClick={() => void loadComments(false)}
                >
                    {commentsLoadingMore && <Loader2 className="animate-spin" />}
                    {commentsLoadingMore ? "加载中…" : "加载更多评论"}
                </Button>
            )}
        </div>
    );
}
