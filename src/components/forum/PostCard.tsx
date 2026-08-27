import React, { useMemo, useState } from "react";
import { Bookmark, Check, ChevronDown, ChevronUp, Copy, Heart, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import Markdown from "@/components/forum/Markdown.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { toggleFavorite, toggleLike, unFavorite, unLike, type Post } from "@/lib/api.ts";
import { formatDate } from "@/lib/format.ts";
import { truncateMarkdown } from "@/lib/markdown.ts";
import { cn } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser";

const PREVIEW_MAX_LENGTH = 100;

export function PostCard({ post, compact }: { post: Post; compact?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const [postState, setPost] = useState<Post>(post);
    const [reactBusy, setReactBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const { excerpt, isTruncated } = useMemo(
        () => truncateMarkdown(postState.content, PREVIEW_MAX_LENGTH),
        [postState.content],
    );

    const toggleExpanded = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpanded((prev) => !prev);
    };

    const me = useUserStore();
    const navigate = useNavigate();
    const requireLogin = (): boolean => {
        if (!me) {
            navigate("/login");
            return false;
        }
        return true;
    };

    const handleLike = async () => {
        if (!postState) return;
        if (!requireLogin()) return;
        setReactBusy(true);
        try {
            const res = postState.is_liked ? await unLike(postState.id) : await toggleLike(postState.id);
            setPost((prev) => (prev ? { ...prev, is_liked: res.liked, likes_count: res.likes_count } : prev));
        } catch (err) {
            console.error(err);
        } finally {
            setReactBusy(false);
        }
    };

    const handleFavorite = async () => {
        if (!postState) return;
        if (!requireLogin()) return;
        setReactBusy(true);
        try {
            const res = postState.is_favorited ? await unFavorite(postState.id) : await toggleFavorite(postState.id);
            setPost((prev) =>
                prev ? { ...prev, is_favorited: res.favorited, favorites_count: res.favorites_count } : prev,
            );
        } catch (err) {
            console.error(err);
        } finally {
            setReactBusy(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.host + `/posts/${postState.id}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* ignore */
        }
    };

    return (
        <Card size="sm">
            <CardContent className="grid gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link
                        to={`/users/${postState.author.id}`}
                        className="flex min-w-0 items-center gap-2 hover:text-foreground"
                    >
                        <Avatar size="sm">
                            {postState.author.avatar ? (
                                <AvatarImage src={postState.author.avatar} alt={postState.author.username} />
                            ) : null}
                            <AvatarFallback>{postState.author.username.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{postState.author.username}</span>
                    </Link>
                    <span>·</span>
                    <span className="shrink-0">{formatDate(postState.created_at)}</span>
                </div>

                <div className="min-w-0 flex flex-col gap-2">
                    <Link to={`/posts/${postState.id}`} className="group block min-w-0">
                        <Markdown
                            content={expanded ? postState.content : excerpt}
                            className={cn("group-hover:opacity-80", compact && "line-clamp-6")}
                        />
                    </Link>
                    {isTruncated && (
                        <Button
                            size="sm"
                            variant={"ghost"}
                            className="self-start w-full text-xs"
                            onClick={toggleExpanded}
                        >
                            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            {expanded ? "收起" : "展开"}
                        </Button>
                    )}
                </div>

                {postState.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {postState.images.map((src, i) => (
                            <img
                                key={i}
                                src={src}
                                alt={`图片 ${i + 1}`}
                                className={cn("rounded-md object-cover", compact ? "size-24" : "max-h-96 w-auto")}
                            />
                        ))}
                    </div>
                )}

                {postState.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {postState.tags.map((tag) => (
                            <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Button
                        variant="ghost"
                        size={"xs"}
                        onClick={handleLike}
                        disabled={reactBusy}
                        className={cn("inline-flex items-center gap-1", postState.is_liked && "text-primary")}
                    >
                        <Heart className={cn("size-3.5", postState.is_liked && "fill-current")} />
                        {postState.likes_count}
                    </Button>
                    <Button
                        variant="ghost"
                        size={"xs"}
                        onClick={handleFavorite}
                        disabled={reactBusy}
                        className={cn("inline-flex items-center gap-1", postState.is_favorited && "text-primary")}
                    >
                        <Bookmark className={cn("size-3.5", postState.is_favorited && "fill-current")} />
                        {postState.favorites_count}
                    </Button>
                    <Button variant="ghost" size={"xs"} disabled className="inline-flex items-center gap-1">
                        <MessageCircle className="size-3.5" />
                        {postState.comments_count}
                    </Button>
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
    );
}

export default PostCard;
