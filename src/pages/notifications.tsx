import { useCallback, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Avatar, AvatarBadge2, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { listNotifications, markNotificationsRead, type AppNotification } from "@/lib/api";
import { parseFrontmatter } from "@/lib/frontmatter.ts";
import { formatRelativeTime } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser.ts";

import { Empty, LoadMore, SkeletonList } from "@/pages/search/common.tsx";
import { useSearchFeed } from "@/pages/search/useSearchFeed.ts";

const LIMIT = 20;

function NotificationMessage({ notification }: { notification: AppNotification }) {
    const name = notification.actor.username;
    switch (notification.type) {
        case "post_comment":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    评论了你的帖子
                </span>
            );
        case "work_comment":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    评论了你的作品
                </span>
            );
        case "post_reply":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    回复了你的评论
                </span>
            );
        case "work_reply":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    回复了你的评论
                </span>
            );
        case "post_tip": {
            let amount = 0.1;
            try {
                if (notification.data) {
                    const parsed = JSON.parse(notification.data) as { amount?: number };
                    if (typeof parsed.amount === "number") amount = parsed.amount;
                }
            } catch {
                // 忽略无效的 data
            }
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    给你投了 {amount} 枚硬币
                </span>
            );
        }
    }
}

function notificationLink(notification: AppNotification): { to: string; text: string } | null {
    const to = notification.post_id
        ? `/posts/${notification.post_id}`
        : notification.work_id
          ? `/works/${notification.work_id}`
          : null;
    if (!to) return null;
    const snippet = (text: string) => parseFrontmatter(text).body || "查看详情";
    if (notification.type === "post_reply" || notification.type === "work_reply") {
        return { to, text: notification.reply_to ? snippet(notification.reply_to) : snippet(notification.snippet) };
    }
    return { to, text: snippet(notification.snippet) };
}

export default function NotificationsPage() {
    const user = useUserStore((s) => s.user);
    const checking = useUserStore((s) => s.checking);
    const navigate = useNavigate();
    const [marked, setMarked] = useState<number[]>([]);

    const fetcher = useCallback((offset: number, limit: number) => listNotifications(offset, limit), []);
    const { items, loading, loadingMore, hasMore, error, load, setItems } = useSearchFeed<AppNotification>(
        fetcher,
        LIMIT,
    );

    const handleOpen = async (notification: AppNotification) => {
        if (notification.is_read) {
            if (notification.post_id) navigate(`/posts/${notification.post_id}`);
            else if (notification.work_id) navigate(`/works/${notification.work_id}`);
            return;
        }
        try {
            await markNotificationsRead([notification.id]);
            setMarked((ids) => (ids.includes(notification.id) ? ids : [...ids, notification.id]));
        } catch {
            // 忽略,不影响跳转
        }
        if (notification.post_id) navigate(`/posts/${notification.post_id}`);
        else if (notification.work_id) navigate(`/works/${notification.work_id}`);
    };

    const handleMarkAll = async () => {
        try {
            await markNotificationsRead();
            setItems((items) => items.map((item) => ({ ...item, is_read: true })));
        } catch (err) {
            console.error(err);
        }
    };

    if (checking) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (!user) {
        navigate("/login");
        return null;
    }
    if (loading) return <SkeletonList />;
    if (error) return <Empty text={error} />;

    const unreadCount = items.filter((item) => !item.is_read && !marked.includes(item.id)).length;

    return (
        <div className="mx-auto w-full p-4 md:p-6">
            <header className="mb-4 flex items-center justify-between">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <Bell className="size-5" />
                    消息中心
                </h1>
                {unreadCount > 0 && (
                    <Button size="sm" variant="outline" onClick={() => void handleMarkAll()}>
                        <CheckCheck />
                        全部已读 ({unreadCount})
                    </Button>
                )}
            </header>

            {items.length === 0 ? (
                <Empty text="暂无消息" />
            ) : (
                <div className="grid gap-3">
                    {items.map((notification) => {
                        const read = notification.is_read || marked.includes(notification.id);
                        const link = notificationLink(notification);
                        return (
                            <Card key={notification.id} className={cn(!read && "border-primary/40 bg-primary/5")}>
                                <CardContent
                                    role="button"
                                    tabIndex={0}
                                    className={cn("flex items-start gap-3 p-3", !read && "font-medium")}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            void handleOpen(notification);
                                        }
                                    }}
                                >
                                    <Link to={`/users/${notification.actor.id}`}>
                                        <Avatar className="shrink-0">
                                            {notification.actor.avatar ? (
                                                <AvatarImage
                                                    src={notification.actor.avatar}
                                                    alt={notification.actor.username}
                                                />
                                            ) : null}
                                            <AvatarFallback>{notification.actor.username.slice(0, 2)}</AvatarFallback>
                                            {!read && <AvatarBadge2 className={"bg-destructive"} />}
                                        </Avatar>
                                    </Link>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="truncate">
                                                <NotificationMessage notification={notification} />
                                            </span>
                                            {link && (
                                                <Link
                                                    to={link.to}
                                                    onClick={() => {
                                                        if (!read) void handleOpen(notification);
                                                    }}
                                                    className="mt-1 block truncate text-sm text-primary hover:underline"
                                                >
                                                    {link.text}
                                                </Link>
                                            )}
                                        </div>

                                        {notification.comment && (
                                            <p className="mt-1 line-clamp-2 rounded-md bg-muted/60 px-2 py-1.5 text-sm text-foreground">
                                                {notification.comment}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formatRelativeTime(notification.created_at)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {hasMore && <LoadMore loading={loadingMore} onClick={() => void load()} />}
                </div>
            )}
        </div>
    );
}
