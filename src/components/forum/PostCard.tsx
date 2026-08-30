import React, { useMemo, useState } from "react";
import { Bookmark, Check, ChevronDown, ChevronUp, Coins, Copy, Heart, MessageCircle, Pin, PinOff } from "lucide-react";
import { Link } from "react-router-dom";

import Markdown from "@/components/forum/Markdown.tsx";
import { UserAvatar } from "@/components/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { useCopyLink } from "@/hooks/useCopyLink.ts";
import { usePostActions } from "@/hooks/usePostActions.ts";
import { type Post } from "@/lib/api";
import { parseFrontmatter } from "@/lib/frontmatter.ts";
import { formatDate } from "@/lib/format.ts";
import { truncateMarkdown } from "@/lib/markdown.ts";
import { cn } from "@/lib/utils.ts";

const PREVIEW_MAX_LENGTH = 100;

export function PostCard({
    post,
    compact,
    canPin = false,
    onPinChanged,
}: {
    post: Post;
    compact?: boolean;
    canPin?: boolean;
    onPinChanged?: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [postState, setPost] = useState<Post>(post);
    const { copied, copy } = useCopyLink();
    const { reactBusy, pinBusy, handleLike, handleFavorite, handleTip, handlePin } = usePostActions({
        post: postState,
        setPost,
    });
    const { title, body } = useMemo(() => parseFrontmatter(postState.content), [postState.content]);
    const { excerpt, isTruncated } = useMemo(() => truncateMarkdown(body, PREVIEW_MAX_LENGTH), [body]);

    const toggleExpanded = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpanded((prev) => !prev);
    };

    return (
        <Card size="sm">
            <CardContent className="grid gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link
                        to={`/users/${postState.author.id}`}
                        className="flex min-w-0 items-center gap-2 hover:text-foreground"
                    >
                        <UserAvatar user={postState.author} size="sm" />
                        <span className="truncate font-medium">{postState.author.username}</span>
                    </Link>
                    <span>·</span>
                    <span className="shrink-0">{formatDate(postState.created_at)}</span>
                    {postState.pinned && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-primary">
                            <Pin className="size-3 fill-current" />
                            置顶
                        </span>
                    )}
                </div>

                <div className="min-w-0 flex flex-col gap-2">
                    <Link to={`/posts/${postState.id}`} className="group block min-w-0">
                        {title && <h3 className="line-clamp-2 text-base font-semibold">{title}</h3>}
                        <Markdown
                            content={expanded ? body : excerpt}
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
                    <Button
                        variant="ghost"
                        size={"xs"}
                        onClick={handleTip}
                        disabled={reactBusy}
                        className="inline-flex items-center gap-1 text-amber-500"
                    >
                        <Coins className="size-3.5" />
                        {postState.coins_count * 10}
                    </Button>
                    <Button variant="ghost" size={"xs"} disabled className="inline-flex items-center gap-1">
                        <MessageCircle className="size-3.5" />
                        {postState.comments_count}
                    </Button>
                    {canPin && (
                        <Button
                            variant="ghost"
                            size={"xs"}
                            onClick={() => void handlePin(onPinChanged)}
                            disabled={pinBusy}
                            className={cn("inline-flex items-center gap-1", postState.pinned && "text-primary")}
                        >
                            {postState.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                            {postState.pinned ? "取消置顶" : "置顶"}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-muted-foreground"
                        onClick={() => void copy(window.location.host + `/posts/${postState.id}`)}
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