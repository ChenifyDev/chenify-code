import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Loader2, UserCheck, UserPlus } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";

import PostCard from "@/components/forum/PostCard.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
    getSpace,
    getSpaceFavorites,
    getSpaceFollowers,
    getSpaceFollowing,
    getSpacePosts,
    toggleFollow,
    updatePrivacy,
    type FollowUser,
    type Post,
    type SpaceSkeleton,
    getSpaceWorks,
    type WorkSummary,
} from "@/lib/api.ts";
import { formatDate } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser.ts";
import { WorkCard } from "@/components/works/WorkCard.tsx";

const LIMIT = 10;

function Empty({ text, className }: { text: string; className?: string }) {
    return <div className={cn("py-8 text-center text-sm text-muted-foreground", className)}>{text}</div>;
}

function SkeletonList() {
    return (
        <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} size="sm">
                    <CardContent className="grid gap-3">
                        <div className="flex items-center gap-2">
                            <Skeleton className="size-6 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

interface TabData<T> {
    items: T[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    hidden: boolean;
    error: string | null;
    initialized: boolean;
    load: (reset?: boolean) => Promise<void>;
    updateItems: (updater: (items: T[]) => T[]) => void;
}

function useTab<T>(
    fetcher: (offset: number) => Promise<{ items: T[]; hasMore: boolean; hidden: boolean }>,
): TabData<T> {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const offsetRef = useRef(0);
    const initializedRef = useRef(false);

    const load = useCallback(
        async (reset = false) => {
            if (reset && !initializedRef.current) {
                initializedRef.current = true;
                setLoading(true);
            } else if (!reset) {
                setLoadingMore(true);
            }
            setError(null);
            try {
                const res = await fetcher(offsetRef.current);
                setHidden(res.hidden);
                setHasMore(res.hasMore);
                setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
                offsetRef.current += res.items.length;
            } catch (err) {
                setError(err instanceof Error ? err.message : "加载失败");
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [fetcher],
    );

    const updateItems = useCallback((updater: (items: T[]) => T[]) => setItems(updater), []);

    return {
        items,
        loading,
        loadingMore,
        hasMore,
        hidden,
        error,
        initialized: initializedRef.current,
        load,
        updateItems,
    };
}

function LoadMore<T>({ tab }: { tab: TabData<T> }) {
    if (!tab.hasMore) return null;
    return (
        <Button variant="outline" className="w-full" disabled={tab.loadingMore} onClick={() => void tab.load()}>
            {tab.loadingMore && <Loader2 className="animate-spin" />}
            {tab.loadingMore ? "加载中…" : "加载更多"}
        </Button>
    );
}

function UserRow({ user, onFollowChange }: { user: FollowUser; onFollowChange: (updated: FollowUser) => void }) {
    const me = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const isSelf = me?.id === user.id;

    const handleFollow = async () => {
        if (!me) {
            navigate("/login");
            return;
        }
        setBusy(true);
        try {
            const res = await toggleFollow(user.id);
            onFollowChange({ ...user, is_following: res.following });
        } catch (err) {
            console.error(err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
            <Link to={`/users/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar>
                    {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
                    <AvatarFallback>{user.username.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-medium">{user.username}</span>
            </Link>
            {!isSelf && (
                <Button
                    size="sm"
                    variant={user.is_following ? "outline" : "default"}
                    disabled={busy}
                    onClick={handleFollow}
                >
                    {user.is_following ? <UserCheck /> : <UserPlus />}
                    {user.is_following ? "已关注" : "关注"}
                </Button>
            )}
        </div>
    );
}

function PostsTab({ tab }: { tab: TabData<Post> }) {
    const { load, initialized } = tab;
    useEffect(() => {
        if (!initialized) void load(true);
    }, [load, initialized]);

    if (tab.loading) return <SkeletonList />;
    if (tab.error) return <Empty text={tab.error} />;
    if (tab.items.length === 0) return <Empty text="还没有帖子" />;
    return (
        <div className="grid gap-3">
            {tab.items.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
            <LoadMore tab={tab} />
        </div>
    );
}

function WorksTab({ tab }: { tab: TabData<WorkSummary> }) {
    const { load, initialized } = tab;
    useEffect(() => {
        if (!initialized) void load(true);
    }, [load, initialized]);

    if (tab.loading) return <SkeletonList />;
    if (tab.error) return <Empty text={tab.error} />;
    if (tab.items.length === 0) return <Empty text="还没有帖子" />;
    return (
        <div className={"m-4 columns-2 sm:columns-3 md:columns-3 lg:columns-3 gap-4 space-y-2"}>
            {tab.items.map((work) => (
                <WorkCard key={work.id} work={work} />
            ))}
            <LoadMore tab={tab} />
        </div>
    );
}

function FavoritesTab({ tab }: { tab: TabData<Post> }) {
    const { load, initialized } = tab;
    useEffect(() => {
        if (!initialized) void load(true);
    }, [load, initialized]);

    if (tab.loading) return <SkeletonList />;
    if (tab.error) return <Empty text={tab.error} />;
    if (tab.hidden) return <Empty text="该用户将收藏设置为私密，无法查看" />;
    if (tab.items.length === 0) return <Empty text="还没有收藏" />;
    return (
        <div className="grid gap-3">
            {tab.items.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
            <LoadMore tab={tab} />
        </div>
    );
}

function UsersTab({ tab, title }: { tab: TabData<FollowUser>; title: string }) {
    const { load, initialized } = tab;
    useEffect(() => {
        if (!initialized) void load(true);
    }, [load, initialized]);

    if (tab.loading) return <SkeletonList />;
    if (tab.error) return <Empty text={tab.error} />;
    if (tab.hidden) return <Empty text="该用户将关注列表设置为私密，无法查看" />;
    if (tab.items.length === 0) return <Empty text={`还没有${title}`} />;
    return (
        <div className="grid gap-1">
            {tab.items.map((user) => (
                <UserRow
                    key={user.id}
                    user={user}
                    onFollowChange={(updated) =>
                        tab.updateItems((items) => items.map((u) => (u.id === updated.id ? updated : u)))
                    }
                />
            ))}
            <div className="pt-2">
                <LoadMore tab={tab} />
            </div>
        </div>
    );
}

function PrivacyRow({
    label,
    checked,
    onCheckedChange,
}: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
            {label}
        </label>
    );
}

function Stat({ label, value }: { label: string; value: number | null }) {
    return (
        <div className="grid gap-0.5 text-center">
            <span className="text-lg font-semibold tabular-nums">{value ?? "-"}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
        </div>
    );
}

function ProfileTabs({ userId }: { userId: number }) {
    const posts = useTab(
        useCallback(
            async (offset) => {
                const list = await getSpacePosts(userId, offset, LIMIT);
                return { items: list, hasMore: list.length === LIMIT, hidden: false };
            },
            [userId],
        ),
    );

    const works = useTab(
        useCallback(
            async (offset) => {
                const list = await getSpaceWorks(userId, offset, LIMIT);
                return { items: list, hasMore: list.length === LIMIT, hidden: false };
            },
            [userId],
        ),
    );

    const favorites = useTab(
        useCallback(
            async (offset) => {
                const res = await getSpaceFavorites(userId, offset, LIMIT);
                return { items: res.posts, hasMore: !res.hidden && res.posts.length === LIMIT, hidden: res.hidden };
            },
            [userId],
        ),
    );

    const following = useTab(
        useCallback(
            async (offset) => {
                const res = await getSpaceFollowing(userId, offset, LIMIT);
                return { items: res.users, hasMore: !res.hidden && res.users.length === LIMIT, hidden: res.hidden };
            },
            [userId],
        ),
    );

    const followers = useTab(
        useCallback(
            async (offset) => {
                const res = await getSpaceFollowers(userId, offset, LIMIT);
                return { items: res.users, hasMore: !res.hidden && res.users.length === LIMIT, hidden: res.hidden };
            },
            [userId],
        ),
    );

    return (
        <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full">
                <TabsTrigger value="posts" className="flex-1">
                    帖子
                </TabsTrigger>
                <TabsTrigger value={"works"} className="flex-1">
                    作品
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex-1">
                    收藏
                </TabsTrigger>
                <TabsTrigger value="following" className="flex-1">
                    关注
                </TabsTrigger>
                <TabsTrigger value="followers" className="flex-1">
                    粉丝
                </TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="pt-4">
                <PostsTab tab={posts} />
            </TabsContent>
            <TabsContent value={"works"} className="pt-4">
                <WorksTab tab={works} />
            </TabsContent>
            <TabsContent value="favorites" className="pt-4">
                <FavoritesTab tab={favorites} />
            </TabsContent>
            <TabsContent value="following" className="pt-4">
                <UsersTab tab={following} title="关注" />
            </TabsContent>
            <TabsContent value="followers" className="pt-4">
                <UsersTab tab={followers} title="粉丝" />
            </TabsContent>
        </Tabs>
    );
}

export default function Profile() {
    const { id: idParam } = useParams();
    const id = Number(idParam);
    const me = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const [space, setSpace] = useState<SpaceSkeleton | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followBusy, setFollowBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setSpace(null);
        getSpace(id)
            .then((data) => {
                if (!cancelled) setSpace(data);
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
    }, [id]);

    const isSelf = me?.id === id;
    const following = space?.relation?.is_following ?? false;

    const handleFollow = async () => {
        if (!me) {
            navigate("/login");
            return;
        }
        setFollowBusy(true);
        try {
            const res = await toggleFollow(id);
            setSpace((prev) =>
                prev
                    ? {
                          ...prev,
                          counts: { ...prev.counts, followers: res.followers_count },
                          relation: prev.relation ? { ...prev.relation, is_following: res.following } : prev.relation,
                      }
                    : prev,
            );
        } catch (err) {
            console.error(err);
        } finally {
            setFollowBusy(false);
        }
    };

    const handlePrivacy = async (field: "is_favorites_public" | "is_follows_public", value: boolean) => {
        try {
            await updatePrivacy({ [field]: value });
            setSpace((prev) => (prev ? { ...prev, user: { ...prev.user, [field]: value } } : prev));
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Card>
                    <CardContent className="flex items-center gap-4">
                        <Skeleton className="size-16 rounded-full" />
                        <div className="grid flex-1 gap-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </CardContent>
                </Card>
                <div className="mt-4">
                    <SkeletonList />
                </div>
            </div>
        );
    }
    if (error || !space) {
        return (
            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Empty text={error ?? "用户不存在"} />
            </div>
        );
    }

    const { user, counts } = space;

    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                            <Avatar size="lg" className="size-16">
                                {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
                                <AvatarFallback className="text-xl">{user.username.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="grid min-w-0 gap-1">
                                <h1 className="truncate text-xl font-semibold">{user.username}</h1>
                                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Calendar className="size-4" />
                                    {formatDate(user.created_at)} 加入
                                </p>
                                {isSelf && <p className="truncate text-sm text-muted-foreground">{user.email}</p>}
                            </div>
                        </div>
                        <div className="grid shrink-0 gap-2">
                            {isSelf ? (
                                <>
                                    <PrivacyRow
                                        label="收藏公开"
                                        checked={user.is_favorites_public}
                                        onCheckedChange={(v) => handlePrivacy("is_favorites_public", v)}
                                    />
                                    <PrivacyRow
                                        label="关注公开"
                                        checked={user.is_follows_public}
                                        onCheckedChange={(v) => handlePrivacy("is_follows_public", v)}
                                    />
                                </>
                            ) : (
                                <Button
                                    variant={following ? "outline" : "default"}
                                    disabled={followBusy}
                                    onClick={handleFollow}
                                >
                                    {following ? <UserCheck /> : <UserPlus />}
                                    {following ? "取消关注" : me ? "关注" : "登录后关注"}
                                </Button>
                            )}
                        </div>
                    </div>
                    <Separator className="mt-4" />
                    <div className="flex items-center justify-around pt-2">
                        <Stat label="帖子" value={counts.posts} />
                        <Stat label={"作品"} value={counts.works} />
                        <Stat label="收藏" value={counts.favorites} />
                        <Stat label="关注" value={counts.following} />
                        <Stat label="粉丝" value={counts.followers} />
                    </div>
                </CardHeader>
            </Card>
            <div className="mt-4">
                <ProfileTabs key={id} userId={id} />
            </div>
        </div>
    );
}
