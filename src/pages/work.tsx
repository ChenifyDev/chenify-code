import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Check, Copy, Heart, MessageCircle, Trash2, UserCheck, UserPlus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
    toggleFollow,
    unFollow,
    listWorkComments,
    type WorkComment,
    createWorkComment,
    unWorkCommentLike,
    deleteWorkComment,
    type WorkDetail,
    unWorkLike,
    toggleWorkLike,
    unWorkFavorite,
    toggleWorkFavorite,
    getWork,
    deleteWork,
    toggleWorkCommentLike,
    type WorkSummary,
    listForks,
} from "@/lib/api.ts";
import { formatDateTime } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser.ts";
import { insertReply, updateComment } from "@/components/comments/utils.ts";
import CommentInput from "@/components/comments/CommentInput.tsx";
import CommentList from "@/components/comments/CommentList.tsx";
import { WorkCard } from "@/components/works/WorkCard.tsx";
import CodeRunner from "@/pages/code-runner.tsx";

const COMMENTS_LIMIT = 20;

function WorkSkeleton() {
    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <Card>
                <CardContent className="grid gap-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="size-8 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </CardContent>
            </Card>
            <div className="mt-4 grid gap-3">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        </div>
    );
}

export default function WorkDetail() {
    const { id: idParam } = useParams();
    const id = Number(idParam);
    const me = useUserStore((s) => s.user);
    const navigate = useNavigate();

    const [work, setWork] = useState<WorkDetail | null>(null);
    const [parent, setParent] = useState<WorkDetail | null>(null);
    const [forks, setForks] = useState<WorkSummary[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [comments, setComments] = useState<WorkComment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
    const [hasMoreComments, setHasMoreComments] = useState(false);
    const [commentError, setCommentError] = useState<string | null>(null);
    const commentsOffsetRef = useRef(0);

    const [draft, setDraft] = useState("");
    const [replyTo, setReplyTo] = useState<WorkComment | null>(null);
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [followBusy, setFollowBusy] = useState(false);
    const [reactBusy, setReactBusy] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setWork(null);
        getWork(id)
            .then((data) => {
                if (!cancelled) setWork(data);
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : "加载失败");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        let ignore = false;
        setParent(null);
        if (!work?.parent_id) return;
        getWork(work.parent_id)
            .then((data) => {
                if (!ignore) setParent(data);
            })
            .catch((err) => {
                if (!ignore) setError(err instanceof Error ? err.message : "加载失败");
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, [work]);

    useEffect(() => {
        let ignore = false;
        setForks(null);
        if (!work?.id) return;
        listForks(work.id)
            .then((data) => {
                if (!ignore) setForks(data);
            })
            .catch((err) => {
                if (!ignore) setError(err instanceof Error ? err.message : "加载失败");
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, [work]);

    const loadComments = useCallback(
        async (reset = false) => {
            if (reset) {
                setCommentsLoading(true);
            } else {
                setCommentsLoadingMore(true);
            }
            setHasMoreComments(false);
            setCommentError(null);
            try {
                const offset = reset ? 0 : commentsOffsetRef.current;
                const list = await listWorkComments(id, offset, COMMENTS_LIMIT);
                setComments((prev) => (reset ? list : [...prev, ...list]));
                commentsOffsetRef.current = (reset ? 0 : commentsOffsetRef.current) + list.length;
                setHasMoreComments(list.length === COMMENTS_LIMIT);
            } catch (err) {
                setCommentError(err instanceof Error ? err.message : "评论加载失败");
            } finally {
                setCommentsLoading(false);
                setCommentsLoadingMore(false);
            }
        },
        [id],
    );

    useEffect(() => {
        void loadComments(true);
    }, [loadComments]);

    const requireLogin = (): boolean => {
        if (!me) {
            navigate("/login");
            return false;
        }
        return true;
    };

    const handleLike = async () => {
        if (!work) return;
        if (!requireLogin()) return;
        setReactBusy(true);
        try {
            const res = work.is_liked ? await unWorkLike(work.id) : await toggleWorkLike(work.id);
            setWork((prev) => (prev ? { ...prev, is_liked: res.liked, likes_count: res.likes_count } : prev));
        } catch (err) {
            console.error(err);
        } finally {
            setReactBusy(false);
        }
    };

    const handleFavorite = async () => {
        if (!work) return;
        if (!requireLogin()) return;
        setReactBusy(true);
        try {
            const res = work.is_favorited ? await unWorkFavorite(work.id) : await toggleWorkFavorite(work.id);
            setWork((prev) =>
                prev ? { ...prev, is_favorited: res.favorited, favorites_count: res.favorites_count } : prev,
            );
        } catch (err) {
            console.error(err);
        } finally {
            setReactBusy(false);
        }
    };

    const handleFollow = async () => {
        if (!work) return;
        if (!requireLogin()) return;
        setFollowBusy(true);
        try {
            const res = work.is_following_author ? await unFollow(work.author.id) : await toggleFollow(work.author.id);
            setWork((prev) => (prev ? { ...prev, is_following_author: res.following } : prev));
        } catch (err) {
            console.error(err);
        } finally {
            setFollowBusy(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };

    const handleSend = async () => {
        if (!work || !draft.trim()) return;
        if (!requireLogin()) return;
        setSending(true);
        try {
            const comment = await createWorkComment(work.id, draft.trim(), replyTo?.id ?? null);
            if (replyTo) {
                setComments((prev) => insertReply(prev, comment));
            } else {
                setComments((prev) => [comment, ...prev]);
            }
            setWork((prev) => (prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev));
            setDraft("");
            setReplyTo(null);
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const handleLikeComment = async (comment: WorkComment) => {
        if (!requireLogin()) return;
        try {
            const res = comment.is_liked
                ? await unWorkCommentLike(comment.id)
                : await toggleWorkCommentLike(comment.id);
            setComments((prev) =>
                updateComment(prev, comment.id, (c) => ({ ...c, is_liked: res.liked, likes_count: res.likes_count })),
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        try {
            await deleteWorkComment(commentId);
            const flat = comments.flatMap((c) => [c, ...c.replies]);
            const removedCount = flat.filter((c) => c.id === commentId || c.parent_id === commentId).length;
            setComments((prev) =>
                prev
                    .filter((c) => c.id !== commentId)
                    .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== commentId) })),
            );
            setWork((prev) =>
                prev ? { ...prev, comments_count: Math.max(0, prev.comments_count - removedCount) } : prev,
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeletePost = async () => {
        if (!work) return;
        setDeleting(true);
        try {
            await deleteWork(work.id);
            navigate(`/users/${work.author.id}`);
        } catch (err) {
            console.error(err);
            setDeleting(false);
        }
    };

    if (loading) return <WorkSkeleton />;
    if (error || !work) {
        return (
            <div className="mx-auto w-full max-w-3xl p-4 text-center text-sm text-muted-foreground md:p-6">
                {error ?? "帖子不存在"}
            </div>
        );
    }

    const isAuthor = me?.id === work.author.id;
    const following = work.is_following_author;

    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <Card>
                <CardHeader>
                    <CardTitle>{work.title}</CardTitle>
                    <CardDescription>{work.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-2">
                            <Link
                                to={`/users/${work.author.id}`}
                                className="flex min-w-0 items-center gap-2 hover:text-foreground"
                            >
                                <Avatar>
                                    {work.author.avatar ? (
                                        <AvatarImage src={work.author.avatar} alt={work.author.username} />
                                    ) : null}
                                    <AvatarFallback>{work.author.username.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm font-medium">{work.author.username}</span>
                            </Link>
                            <span className="text-xs text-muted-foreground">· {formatDateTime(work.created_at)}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {isAuthor ? (
                                <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDeletePost}>
                                    <Trash2 />
                                    {deleting ? "删除中…" : "删除帖子"}
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant={following ? "outline" : "default"}
                                    disabled={followBusy}
                                    onClick={handleFollow}
                                >
                                    {following ? <UserCheck /> : <UserPlus />}
                                    {following ? "已关注" : me ? "关注" : "登录后关注"}
                                </Button>
                            )}
                        </div>
                    </div>

                    <CodeRunner id={work.id} className={"border rounded-2xl h-75"} />

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(work.is_liked && "text-primary")}
                            disabled={reactBusy}
                            onClick={handleLike}
                        >
                            <Heart className={cn("size-4", work.is_liked && "fill-current")} />
                            点赞 {work.likes_count}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(work.is_favorited && "text-primary")}
                            disabled={reactBusy}
                            onClick={handleFavorite}
                        >
                            <Bookmark className={cn("size-4", work.is_favorited && "fill-current")} />
                            收藏 {work.favorites_count}
                        </Button>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <MessageCircle className="size-4" />
                            {work.comments_count}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-muted-foreground"
                            onClick={handleCopyLink}
                        >
                            {copied ? <Check /> : <Copy />}
                            {copied ? "已复制" : "复制链接"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-5" />

            <div className={"flex gap-2"}>
                <Card className={"flex-7 flex flex-col"}>
                    <CardContent className="grid gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <MessageCircle className="size-4" />
                            评论 {work.comments_count}
                        </div>

                        <CommentInput
                            me={me}
                            draft={draft}
                            sending={sending}
                            replyTo={replyTo}
                            setDraft={setDraft}
                            setReplyTo={setReplyTo}
                            handleSend={handleSend}
                        />

                        <CommentList
                            commentsLoading={commentsLoading}
                            commentError={commentError}
                            comments={comments}
                            handleDeleteComment={handleDeleteComment}
                            setReplyTo={setReplyTo}
                            loadComments={loadComments}
                            hasMoreComments={hasMoreComments}
                            handleLikeComment={handleLikeComment}
                            commentsLoadingMore={commentsLoadingMore}
                        />
                    </CardContent>
                </Card>

                {((forks && forks.length > 0) || work.parent_id) && (
                    <div className={"flex-3"}>
                        {work.parent_id && parent && (
                            <Card className={"overflow-y-auto"}>
                                <CardHeader>
                                    <CardTitle>改编自</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <WorkCard work={parent} />
                                </CardContent>
                            </Card>
                        )}
                        {forks && forks.length > 0 && (
                            <Card className={"flex flex-col gap-3 overflow-y-auto"}>
                                <CardHeader>
                                    <CardTitle>复刻</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {forks.map((fork) => (
                                        <WorkCard key={`${fork.parent_id}-${fork.id}`} work={fork} />
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
