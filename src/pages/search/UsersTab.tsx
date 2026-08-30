import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

import { UserAvatar } from "@/components/avatar.tsx";
import { type FollowUser, searchUsers } from "@/lib/api";
import { formatDate } from "@/lib/format.ts";

import Empty from "@/components/tab/Empty.tsx";
import SkeletonList from "@/components/forum/SkeletonList.tsx";
import LoadMore from "@/components/tab/LoadMore.tsx";
import { useInfiniteList } from "@/hooks/useInfiniteList.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { UserCheck, UserPlus } from "lucide-react";
import { useUserStore } from "@/stores/useUser.ts";
import { useFollow } from "@/hooks/useFollow.ts";

const LIMIT = 10;

// 每行是一个独立子组件：由于列表里有多行用户，关注状态/忙碌标志必须按行隔离，
// 不能让一个组件实例持有多行共享的 busy。
function SearchUserRow({ user, onChanged }: { user: FollowUser; onChanged: (updated: FollowUser) => void }) {
    const navigate = useNavigate();
    const me = useUserStore((s) => s.user);
    const { busy, toggle } = useFollow({
        userId: user.id,
        isFollowing: user.is_following,
        useUnfollow: user.is_following,
        onToggle: (res) => onChanged({ ...user, is_following: res.following }),
    });

    const handleToggle = () => {
        if (!me) {
            navigate("/login");
            return;
        }
        void toggle();
    };

    return (
        <Card>
            <CardContent className={"flex gap-2 justify-between"}>
                <div className={"flex gap-2"}>
                    <Link to={`/users/${user.id}`}>
                        <UserAvatar user={user} />
                    </Link>
                    <div className="grid min-w-0 flex-1 gap-0.5">
                        <Link to={`/users/${user.id}`}>
                            <span className="truncate text-sm font-medium">{user.username}</span>
                        </Link>
                        <span className="truncate text-xs text-muted-foreground">
                            {formatDate(user.created_at)} 加入
                        </span>
                    </div>
                </div>
                {!(me?.id === user.id) && (
                    <Button
                        size="sm"
                        variant={user.is_following ? "outline" : "default"}
                        disabled={busy}
                        onClick={handleToggle}
                    >
                        {user.is_following ? <UserCheck /> : <UserPlus />}
                        {user.is_following ? "已关注" : "关注"}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function UsersTab({ keyword }: { keyword: string }) {
    const feed = useInfiniteList<FollowUser>({
        fetcher: useCallback(
            async (offset, limit) => {
                const res = await searchUsers({ offset, limit, keyword });
                return { items: res.items, hasMore: res.hasMore, hidden: false };
            },
            [keyword],
        ),
        limit: LIMIT,
    });

    const { setItems } = feed;

    const handleFollowChange = useCallback(
        (updated: FollowUser) => setItems((items) => items.map((u) => (u.id === updated.id ? updated : u))),
        [setItems],
    );

    if (feed.loading) return <SkeletonList />;
    if (feed.error) return <Empty text={feed.error} />;
    if (feed.items.length === 0) return <Empty text="没有找到相关用户" />;
    return (
        <div className="grid gap-3">
            {feed.items.map((user) => (
                <SearchUserRow key={user.id} user={user} onChanged={handleFollowChange} />
            ))}
            {feed.hasMore && <LoadMore loading={feed.loadingMore} onClick={() => void feed.load()} />}
        </div>
    );
}