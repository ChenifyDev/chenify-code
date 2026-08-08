import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Check, Copy, Heart, Loader2, MessageCircle, Send, Trash2, UserCheck, UserPlus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Markdown from "@/components/Markdown.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
    createComment,
    deleteComment,
    deletePost,
    getPost,
    listComments,
    toggleFavorite,
    toggleFollow,
    toggleLike,
    unFavorite,
    unFollow,
    unLike,
    type Comment,
    type Post,
} from "@/lib/api.ts";
import { formatDateTime } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser.ts";

const COMMENTS_LIMIT = 20;

function PostSkeleton() {
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

function CommentRow({ comment, onDelete }: { comment: Comment; onDelete: (commentId: number) => void }) {
    const me = useUserStore((s) => s.user);
    const isSelf = me?.id === comment.author.id;
    return (
        <div className="grid gap-1.5">
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
                <span>·</span>
                <span className="shrink-0">{formatDateTime(comment.created_at)}</span>
                {isSelf && (
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="删除评论"
                        onClick={() => onDelete(comment.id)}
                    >
                        <Trash2 />
                    </Button>
                )}
            </div>
            <p className="whitespace-pre-wrap pl-9 text-sm">{comment.content}</p>
        </div>
    );
}

export default function PostDetail() {
    const { id: idParam } = useParams();
    const id = Number(idParam);
    const me = useUserStore((s) => s.user);
    const navigate = useNavigate();

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
    const [hasMoreComments, setHasMoreComments] = useState(false);
    const [commentError, setCommentError] = useState<string | null>(null);
    const commentsOffsetRef = useRef(0);

    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [followBusy, setFollowBusy] = useState(false);
    const [reactBusy, setReactBusy] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setPost(null);
        getPost(id)
            .then((data) => {
                if (!cancelled) setPost(data);
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
                const list = await listComments(id, offset, COMMENTS_LIMIT);
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
        if (!post) return;
        if (!requireLogin()) return;
        setReactBusy(true);
        try {
            const res = post.is_liked ? await unLike(post.id) : await toggleLike(post.id);
            setPost((prev) => (prev ? { ...prev, is_liked: res.liked, likes_count: res.likes_count } : prev));
        } catch (err) {
            console.error(err);
        } finally {
            setReactBusy(false);
        }
    };

    const handleFavorite = async () => {
        if (!post) return;
        if (!requireLogin()) return;
        setReactBusy(true);
        try {
            const res = post.is_favorited ? await unFavorite(post.id) : await toggleFavorite(post.id);
            setPost((prev) =>
                prev ? { ...prev, is_favorited: res.favorited, favorites_count: res.favorites_count } : prev,
            );
        } catch (err) {
            console.error(err);
        } finally {
            setReactBusy(false);
        }
    };

    const handleFollow = async () => {
        if (!post) return;
        if (!requireLogin()) return;
        setFollowBusy(true);
        try {
            const res = post.is_following_author ? await unFollow(post.author.id) : await toggleFollow(post.author.id);
            setPost((prev) => (prev ? { ...prev, is_following_author: res.following } : prev));
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
        if (!post || !draft.trim()) return;
        if (!requireLogin()) return;
        setSending(true);
        try {
            const comment = await createComment(post.id, draft.trim());
            setComments((prev) => [comment, ...prev]);
            setPost((prev) => (prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev));
            setDraft("");
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        try {
            await deleteComment(commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            setPost((prev) => (prev ? { ...prev, comments_count: Math.max(0, prev.comments_count - 1) } : prev));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeletePost = async () => {
        if (!post) return;
        setDeleting(true);
        try {
            await deletePost(post.id);
            navigate(`/users/${post.author.id}`);
        } catch (err) {
            console.error(err);
            setDeleting(false);
        }
    };

    if (loading) return <PostSkeleton />;
    if (error || !post) {
        return (
            <div className="mx-auto w-full max-w-3xl p-4 text-center text-sm text-muted-foreground md:p-6">
                {error ?? "帖子不存在"}
            </div>
        );
    }

    const isAuthor = me?.id === post.author.id;
    const following = post.is_following_author;

    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <Card>
                <CardContent className="grid gap-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-2">
                            <Link
                                to={`/users/${post.author.id}`}
                                className="flex min-w-0 items-center gap-2 hover:text-foreground"
                            >
                                <Avatar>
                                    {post.author.avatar ? (
                                        <AvatarImage src={post.author.avatar} alt={post.author.username} />
                                    ) : null}
                                    <AvatarFallback>{post.author.username.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm font-medium">{post.author.username}</span>
                            </Link>
                            <span className="text-xs text-muted-foreground">· {formatDateTime(post.created_at)}</span>
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

                    <Markdown content={post.content} />

                    {post.images.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {post.images.map((src, i) => (
                                <img
                                    key={i}
                                    src={src}
                                    alt={`图片 ${i + 1}`}
                                    className="max-h-96 w-auto rounded-md object-cover"
                                />
                            ))}
                        </div>
                    )}

                    {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {post.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(post.is_liked && "text-primary")}
                            disabled={reactBusy}
                            onClick={handleLike}
                        >
                            <Heart className={cn("size-4", post.is_liked && "fill-current")} />
                            点赞 {post.likes_count}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(post.is_favorited && "text-primary")}
                            disabled={reactBusy}
                            onClick={handleFavorite}
                        >
                            <Bookmark className={cn("size-4", post.is_favorited && "fill-current")} />
                            收藏 {post.favorites_count}
                        </Button>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <MessageCircle className="size-4" />
                            {post.comments_count}
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

            <Card>
                <CardContent className="grid gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <MessageCircle className="size-4" />
                        评论 {post.comments_count}
                    </div>

                    {me ? (
                        <div className="flex gap-2">
                            <Avatar size="sm" className="mt-1 shrink-0">
                                {me.avatar ? <AvatarImage src={me.avatar} alt={me.username} /> : null}
                                <AvatarFallback>{me.username.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        void handleSend();
                                    }
                                }}
                                placeholder="写下你的评论…"
                                rows={2}
                                className="min-h-16 w-full flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                            />
                            <Button
                                variant="default"
                                size="sm"
                                className="mt-1 shrink-0"
                                disabled={sending || !draft.trim()}
                                onClick={handleSend}
                            >
                                {sending ? <Loader2 className="animate-spin" /> : <Send />}
                                发送
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            <button
                                className="text-primary underline underline-offset-2"
                                onClick={() => navigate("/login")}
                            >
                                登录
                            </button>
                            &nbsp;后参与评论
                        </p>
                    )}

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
                                <CommentRow key={comment.id} comment={comment} onDelete={handleDeleteComment} />
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
                </CardContent>
            </Card>
        </div>
    );
}
