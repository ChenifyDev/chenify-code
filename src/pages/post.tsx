import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Check, Copy, Heart, MessageCircle, Pencil, Trash2, UserCheck, UserPlus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Markdown from "@/components/forum/Markdown.tsx";
import PostAstTree from "@/components/forum/PostAstTree.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
    createComment,
    deleteComment,
    getPost,
    getPostDraft,
    listComments,
    toggleCommentLike,
    toggleFavorite,
    toggleFollow,
    toggleLike,
    unCommentLike,
    unFavorite,
    unFollow,
    unLike,
    type PostComment as Comment,
    type Post,
    deleteDraft,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser.ts";
import { insertReply, updateComment } from "@/components/comments/utils.ts";
import CommentInput from "@/components/comments/CommentInput.tsx";
import CommentList from "@/components/comments/CommentList.tsx";

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
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [followBusy, setFollowBusy] = useState(false);
    const [reactBusy, setReactBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [draftId, setDraftId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setPost(null);
        setDraftId(null);
        getPost(id)
            .then(async (data) => {
                if (cancelled) return;
                setPost(data);
                if (me?.id === data.author.id) {
                    try {
                        const draft = await getPostDraft(id);
                        if (!cancelled) setDraftId(draft.id);
                    } catch {
                        /* ignore */
                    }
                }
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
    }, [id, me?.id]);

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
            const comment = await createComment(post.id, draft.trim(), replyTo?.id ?? null);
            if (replyTo) {
                setComments((prev) => insertReply(prev, comment));
            } else {
                setComments((prev) => [comment, ...prev]);
            }
            setPost((prev) => (prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev));
            setDraft("");
            setReplyTo(null);
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const handleLikeComment = async (comment: Comment) => {
        if (!requireLogin()) return;
        try {
            const res = comment.is_liked ? await unCommentLike(comment.id) : await toggleCommentLike(comment.id);
            setComments((prev) =>
                updateComment(prev, comment.id, (c) => ({ ...c, is_liked: res.liked, likes_count: res.likes_count })),
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        try {
            await deleteComment(commentId);
            const flat = comments.flatMap((c) => [c, ...c.replies]);
            const removedCount = flat.filter((c) => c.id === commentId || c.parent_id === commentId).length;
            setComments((prev) =>
                prev
                    .filter((c) => c.id !== commentId)
                    .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== commentId) })),
            );
            setPost((prev) =>
                prev ? { ...prev, comments_count: Math.max(0, prev.comments_count - removedCount) } : prev,
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeletePost = async () => {
        if (!post || !draftId) return;
        setDeleting(true);
        try {
            await deleteDraft(draftId);
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
        <div className="relative mx-auto w-full max-w-3xl p-4 md:p-6">
            <PostAstTree content={post.content} />
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
                                <div className="flex shrink-0 items-center gap-2">
                                    {draftId != null && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/write?id=${draftId}`)}
                                        >
                                            <Pencil />
                                            编辑
                                        </Button>
                                    )}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={deleting}
                                        onClick={handleDeletePost}
                                    >
                                        <Trash2 />
                                        {deleting ? "删除中…" : "删除帖子"}
                                    </Button>
                                </div>
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
        </div>
    );
}
