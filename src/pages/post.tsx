import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import CommentInput from "@/components/comments/CommentInput.tsx";
import CommentList from "@/components/comments/CommentList.tsx";
import { insertReply, updateComment } from "@/components/comments/utils.ts";
import Markdown from "@/components/forum/Markdown.tsx";
import PostAstTree from "@/components/forum/PostAstTree.tsx";
import { PostActionsBar } from "@/components/forum/PostActionsBar.tsx";
import { PostDetailHeader } from "@/components/forum/PostDetailHeader.tsx";
import { PostSkeleton } from "@/components/forum/PostSkeleton.tsx";
import Empty from "@/components/tab/Empty.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
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
import { parseFrontmatter } from "@/lib/frontmatter.ts";
import { useUserStore } from "@/stores/useUser.ts";

const COMMENTS_LIMIT = 20;

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

    // usePostActions/useFollow 用函数式 setState 合并结果；包一层以规避 post 为 null 时的空值
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

    // 评论列表不走 autoStart，由下方 effect 在"允许评论"时才首次加载
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
                        // 作者草稿 id 只为开启顶部"编辑"按钮，未发表时也可进入写帖页
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

    // 评论区开关变化时按需（重新）加载评论
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
            // 评论开关存于正文 frontmatter 的 commentArea 字段，服务端更新后回读解析
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
            // 回复插入到父评论的 replies 下；普通评论置于列表顶部
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
            // 删除评论时其 replies 也一并删除：先把两层扁平化统计实际移除条数，
            // 再同步递减帖子的 comments_count（clamp 到 0）
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
                    <PostDetailHeader
                        post={post}
                        isAuthor={isAuthor}
                        isMe={!!me}
                        draftId={draftId}
                        following={following}
                        followBusy={followBusy}
                        deleting={deleting}
                        onEdit={() => navigate(`/write?id=${draftId}`)}
                        onDelete={() => void handleDeletePost()}
                        onFollow={() => void handleFollow()}
                    />

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

                    <PostActionsBar
                        post={post}
                        isAuthor={isAuthor}
                        commentArea={commentArea}
                        reactBusy={reactBusy}
                        pinBusy={pinBusy}
                        commentAreaBusy={commentAreaBusy}
                        copied={copied}
                        onLike={() => void handleLike()}
                        onFavorite={() => void handleFavorite()}
                        onTip={() => void handleTip()}
                        onTogglePin={() => void handleTogglePin()}
                        onToggleCommentArea={() => void handleToggleCommentArea()}
                        onCopy={() => void copy(window.location.href)}
                    />
                </CardContent>
            </Card>

            <Separator className="my-5" />

            {commentArea ? (
                <Card>
                    <CardContent className="grid gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <MessageCircle />
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