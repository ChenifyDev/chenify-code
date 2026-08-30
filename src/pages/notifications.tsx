import { useCallback, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { NotificationRow } from "@/components/notifications/NotificationRow.tsx";
import { notificationLink } from "@/components/notifications/notificationLink.ts";
import SkeletonList from "@/components/forum/SkeletonList.tsx";
import Empty from "@/components/tab/Empty.tsx";
import LoadMore from "@/components/tab/LoadMore.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useInfiniteList } from "@/hooks/useInfiniteList.ts";
import { listNotifications, markNotificationsRead, type AppNotification } from "@/lib/api";
import { useUserStore } from "@/stores/useUser.ts";

const LIMIT = 20;

export default function NotificationsPage() {
    const user = useUserStore((s) => s.user);
    const checking = useUserStore((s) => s.checking);
    const navigate = useNavigate();
    // marked 记录本次会话内"点开即已读"的通知 id（乐观标记，不等服务端回包刷新列表）
    const [marked, setMarked] = useState<number[]>([]);

    const feed = useInfiniteList<AppNotification>({
        fetcher: useCallback(async (offset, limit) => {
            const res = await listNotifications(offset, limit);
            return { items: res.items, hasMore: res.hasMore, hidden: false };
        }, []),
        limit: LIMIT,
    });

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
            feed.setItems((items) => items.map((item) => ({ ...item, is_read: true })));
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
    if (feed.loading) return <SkeletonList />;
    if (feed.error) return <Empty text={feed.error} />;

    // 未读数 = 尚未读 且 本会话未被点开过的通知数
    const unreadCount = feed.items.filter((item) => !item.is_read && !marked.includes(item.id)).length;

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

            {feed.items.length === 0 ? (
                <Empty text="暂无消息" />
            ) : (
                <div className="grid gap-3">
                    {feed.items.map((notification) => {
                        const read = notification.is_read || marked.includes(notification.id);
                        const link = notificationLink(notification);
                        return (
                            <NotificationRow
                                key={notification.id}
                                notification={notification}
                                read={read}
                                link={link}
                                onOpen={handleOpen}
                            />
                        );
                    })}
                    {feed.hasMore && <LoadMore loading={feed.loadingMore} onClick={() => void feed.load()} />}
                </div>
            )}
        </div>
    );
}