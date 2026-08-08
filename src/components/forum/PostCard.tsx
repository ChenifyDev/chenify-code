import { Bookmark, Heart, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

import Markdown from "@/components/forum/Markdown.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import type { Post } from "@/lib/api.ts";
import { formatDate } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";

export function PostCard({ post, compact }: { post: Post; compact?: boolean }) {
    return (
        <Card size="sm">
            <CardContent className="grid gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link
                        to={`/users/${post.author.id}`}
                        className="flex min-w-0 items-center gap-2 hover:text-foreground"
                    >
                        <Avatar size="sm">
                            {post.author.avatar ? (
                                <AvatarImage src={post.author.avatar} alt={post.author.username} />
                            ) : null}
                            <AvatarFallback>{post.author.username.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{post.author.username}</span>
                    </Link>
                    <span>·</span>
                    <span className="shrink-0">{formatDate(post.created_at)}</span>
                </div>

                <Link to={`/posts/${post.id}`} className="group block min-w-0">
                    <Markdown
                        content={post.content}
                        className={cn("group-hover:opacity-80", compact && "line-clamp-6")}
                    />
                </Link>

                {post.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {post.images.map((src, i) => (
                            <img
                                key={i}
                                src={src}
                                alt={`图片 ${i + 1}`}
                                className={cn("rounded-md object-cover", compact ? "size-24" : "max-h-96 w-auto")}
                            />
                        ))}
                    </div>
                )}

                {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                            <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <MessageCircle className="size-3.5" />
                        {post.comments_count}
                    </span>
                    <span className={cn("inline-flex items-center gap-1", post.is_liked && "text-primary")}>
                        <Heart className={cn("size-3.5", post.is_liked && "fill-current")} />
                        {post.likes_count}
                    </span>
                    <span className={cn("inline-flex items-center gap-1", post.is_favorited && "text-primary")}>
                        <Bookmark className={cn("size-3.5", post.is_favorited && "fill-current")} />
                        {post.favorites_count}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

export default PostCard;
