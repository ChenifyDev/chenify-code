import { Bookmark, Check, Coins, Copy, Heart, MessageCircle, MessageCircleOff, Pin, PinOff } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import type { Post } from "@/lib/api";
import { cn } from "@/lib/utils.ts";

type PostActionsBarProps = {
    post: Post;
    isAuthor: boolean;
    commentArea: boolean;
    reactBusy: boolean;
    pinBusy: boolean;
    commentAreaBusy: boolean;
    copied: boolean;
    onLike: () => void;
    onFavorite: () => void;
    onTip: () => void;
    onTogglePin: () => void;
    onToggleCommentArea: () => void;
    onCopy: () => void;
};

export function PostActionsBar({
    post,
    isAuthor,
    commentArea,
    reactBusy,
    pinBusy,
    commentAreaBusy,
    copied,
    onLike,
    onFavorite,
    onTip,
    onTogglePin,
    onToggleCommentArea,
    onCopy,
}: PostActionsBarProps) {
    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="sm"
                className={cn(post.is_liked && "text-primary")}
                disabled={reactBusy}
                onClick={onLike}
            >
                <Heart className={cn("size-4", post.is_liked && "fill-current")} />
                点赞 {post.likes_count}
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn(post.is_favorited && "text-primary")}
                disabled={reactBusy}
                onClick={onFavorite}
            >
                <Bookmark className={cn("size-4", post.is_favorited && "fill-current")} />
                收藏 {post.favorites_count}
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="text-amber-500"
                disabled={reactBusy}
                onClick={onTip}
                title="投 1 枚硬币，作者获得 0.1 枚"
            >
                <Coins className="size-4" />
                {/* coins_count 按 0.1 枚存储，这里换算为整枚展示 */}
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
                    onClick={onTogglePin}
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
                    onClick={onToggleCommentArea}
                    title={commentArea ? "关闭评论" : "开启评论"}
                >
                    {commentArea ? <MessageCircleOff className="size-4" /> : <MessageCircle className="size-4" />}
                    {commentAreaBusy ? "保存中…" : commentArea ? "关闭评论" : "开启评论"}
                </Button>
            )}
            <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-muted-foreground"
                onClick={onCopy}
            >
                {copied ? <Check /> : <Copy />}
                {copied ? "已复制" : "复制链接"}
            </Button>
        </div>
    );
}