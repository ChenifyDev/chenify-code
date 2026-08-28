import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { type FollowUser, searchUsers, toggleFollow } from "@/lib/api";
import { formatDate } from "@/lib/format.ts";

import { Empty, LoadMore, SkeletonList } from "@/pages/search/common.tsx";
import { useSearchFeed } from "@/pages/search/useSearchFeed.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { UserCheck, UserPlus } from "lucide-react";
import { useUserStore } from "@/stores/useUser.ts";

const LIMIT = 10;

export default function UsersTab({ keyword }: { keyword: string }) {
    const fetcher = useCallback((offset: number, limit: number) => searchUsers({ offset, limit, keyword }), [keyword]);
    const { items, loading, loadingMore, hasMore, error, load, setItems } = useSearchFeed<FollowUser>(fetcher, LIMIT);
    const navigate = useNavigate();
    const me = useUserStore((s) => s.user);
    const [busy, setBusy] = useState<boolean>(false);

    const handleFollow = async (user: FollowUser) => {
        if (!me) {
            navigate("/login");
            return;
        }
        setBusy(true);
        try {
            const res = await toggleFollow(user.id);

            const updated = { ...user, is_following: res.following };
            setItems((items) => items.map((u) => (u.id === updated.id ? updated : u)));
        } catch (err) {
            console.error(err);
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <SkeletonList />;
    if (error) return <Empty text={error} />;
    if (items.length === 0) return <Empty text="没有找到相关用户" />;
    return (
        <div className="grid gap-3">
            {items.map((user) => (
                <Card key={user.id}>
                    <CardContent className={"flex gap-2 justify-between"}>
                        <div className={"flex gap-2"}>
                            <Link to={`/users/${user.id}`}>
                                <Avatar>
                                    {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
                                    <AvatarFallback>{user.username.slice(0, 2)}</AvatarFallback>
                                </Avatar>
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
                                onClick={async () => await handleFollow(user)}
                            >
                                {user.is_following ? <UserCheck /> : <UserPlus />}
                                {user.is_following ? "已关注" : "关注"}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ))}
            {hasMore && <LoadMore loading={loadingMore} onClick={() => void load()} />}
        </div>
    );
}
