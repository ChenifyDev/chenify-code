import { useCallback, useEffect, useState } from "react";
import {
    Bookmark,
    Check,
    Coins,
    Copy,
    Heart,
    MessageCircle,
    MessageCircleOff,
    Pencil,
    Pin,
    PinOff,
    Trash2,
    UserCheck,
    UserPlus,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Markdown from "@/components/forum/Markdown.tsx";
import PostAstTree from "@/components/forum/PostAstTree.tsx";
import { UserAvatar } from "@/components/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCopyLink } from "@/hooks/useCopyLink.ts";
import { useFollow } from "@/hooks/useFollow.ts";
import { useInfiniteList } from "@/hooks/useInfiniteList.ts";
import { usePostActions } from "@/hooks/usePostActions.ts";
import {
    createComment,
    deleteComment,
    deleteDraft,
    getPost,
    getPostDraft,
    listComments,
    setPostCommentArea,
    toggleCommentLike,
    unCommentLike,
    type Post,
    type PostComment as Comment,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format.ts";
import { parseFrontmatter } from "@/lib/frontmatter.ts";
import { cn } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser.ts";
import { insertReply, updateComment } from "@/components/comments/utils.ts";
import CommentInput from "@/components/comments/CommentInput.tsx";
import CommentList from "@/components/comments/CommentList.tsx";
import Empty from "@/components/tab/Empty.tsx";

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

    const [draft, setDraft] = useState("");
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [draftId, setDraftId] = useState<number | null>(null);
    const [commentArea, setCommentArea] = useState(true);
    const [commentAreaBusy, setCommentAreaBusy] = useState(false);

    const setPostMerge = useCallback(
        (updater: (prev: Post) => Post) => setPost((prev) => (prev ? updater(prev) : prev)),
        [],
    );

    const { reactBusy, pinBusy, handleLike, handleFavorite, handleTip, handlePin: handleTogglePin } = usePostActions({
        post,
        setPost: setPostMerge,
    });

    const { copied, copy } = useCopyLink();

    const { busy: followBusy, toggle: handleFollow } = useFollow({
        userId: post?.author.id ?? 0,
        isFollowing: post?.is_following_author ?? false,
        useUnfollow: true,
        enabled: !!post,
        onToggle: (res) => setPostMerge((prev) => ({ ...prev, is_following_author: res.following })),
    });

    const commentsFeed = useInfiniteList<Comment>({
        fetcher: useCallback(
            async (offset) => {
                const list = await listComments(id, offset, COMMENTS_LIMIT);
                return { items: list, hasMore: list.length === COMMENTS_LIMIT, hidden: false };
            },
            [id],
        ),
        limit: COMMENTS_LIMIT,
        autoStart: false,
    });
    const { load: loadCommentsFeed, items: commentItems } = commentsFeed;
    const comments = commentItems;

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
                setCommentArea(parseFrontmatter(data.content).commentArea);
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

    useEffect(() => {
        if (!commentArea) return;
        void loadCommentsFeed(true);
    }, [loadCommentsFeed, commentArea]);

    const requireLogin = (): boolean => {
        if (!me) {
            navigate("/login");
            return false;
        }
        return true;
    };

    const handleToggleCommentArea = async () => {
        if (!post) return;
        setCommentAreaBusy(true);
        try {
            const updated = await setPostCommentArea(post.id, !commentArea);
            setPost(updated);
            setCommentArea(parseFrontmatter(updated.content).commentArea);
        } catch (err) {
            console.error(err);
        } finally {
            setCommentAreaBusy(false);
        }
    };

    const handleSend = async () => {
        if (!post || !draft.trim()) return;
        if (!requireLogin()) return;
        setSending(true);
        try {
            const comment = await createComment(post.id, draft.trim(), replyTo?.id ?? null);
            if (replyTo) {
                commentsFeed.setItems((prev) => insertReply(prev, comment));
            } else {
                commentsFeed.setItems((prev) => [comment, ...prev]);
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
            commentsFeed.setItems((prev) =>
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
            commentsFeed.setItems((prev) =>
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
                                <UserAvatar user={post.author} />
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
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-500"
                            disabled={reactBusy}
                            onClick={handleTip}
                            title="投 1 枚硬币，作者获得 0.1 枚"
                        >
                            <Coins className="size-4" />
                            投币 {post.coins_count * 10}
                        </Button>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <MessageCircle className="size-4" />
                            {post.comments_count}
                        </span>
                        {isAuthor && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(post.pinned && "text-primary")}
                                disabled={pinBusy}
                                onClick={() => void handleTogglePin()}
                                title={post.pinned ? "取消置顶" : "置顶"}
                            >
                                {post.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                                {pinBusy ? "保存中…" : post.pinned ? "取消置顶" : "置顶"}
                            </Button>
                        )}
                        {isAuthor && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                disabled={commentAreaBusy}
                                onClick={handleToggleCommentArea}
                                title={commentArea ? "关闭评论" : "开启评论"}
                            >
                                {commentArea ? (
                                    <MessageCircleOff className="size-4" />
                                ) : (
                                    <MessageCircle className="size-4" />
                                )}
                                {commentAreaBusy ? "保存中…" : commentArea ? "关闭评论" : "开启评论"}
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-muted-foreground"
                            onClick={() => void copy(window.location.href)}
                        >
                            {copied ? <Check /> : <Copy />}
                            {copied ? "已复制" : "复制链接"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-5" />

            {commentArea ? (
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
                            commentsLoading={commentsFeed.loading}
                            commentError={commentsFeed.error}
                            comments={comments}
                            handleDeleteComment={handleDeleteComment}
                            setReplyTo={setReplyTo}
                            loadComments={commentsFeed.load}
                            hasMoreComments={commentsFeed.hasMore}
                            handleLikeComment={handleLikeComment}
                            commentsLoadingMore={commentsFeed.loadingMore}
                        />
                    </CardContent>
                </Card>
            ) : (
                <Empty text={isAuthor ? "评论已关闭，点击上方「开启评论」可恢复" : "作者已关闭了评论"} />
            )}
        </div>
    );
}
