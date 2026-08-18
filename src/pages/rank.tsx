import { type FollowUser, type PointsUser, rankUsersByFollowers, rankUsersByPostPoints } from "@/lib/api.ts";
import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import Empty from "@/components/tab/Empty.tsx";
import UserRow from "@/components/user/UserRow.tsx";
import LoadMore from "@/components/tab/LoadMore.tsx";
import type { TabData } from "@/types/tab.ts";
import useTab from "@/hooks/useTab.ts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";

const LIMIT = 10;

function beamLayer(width: string, via: string, distance: string) {
    return (
        <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box]"
            style={{ "--border-beam-width": width, borderWidth: "var(--border-beam-width)" } as CSSProperties}
        >
            <div
                className={`absolute aspect-square bg-linear-to-l from-transparent ${via} to-transparent`}
                style={{ width: "150px", offsetPath: "rect(0px auto auto 0px round 150px)", offsetDistance: distance }}
            />
        </div>
    );
}

const PODIUM_SLOTS = [
    {
        medal: "🥇",
        order: "order-2",
        medalWrap: "size-12 sm:size-24",
        medalText: "text-4xl sm:text-8xl",
        avatar: "size-10 sm:size-16",
        name: "max-w-16 sm:max-w-36 text-xs sm:text-lg",
        count: "text-sm sm:text-xl",
    },
    {
        medal: "🥈",
        order: "order-1",
        medalWrap: "size-10 sm:size-20",
        medalText: "text-3xl sm:text-6xl",
        avatar: "size-8 sm:size-14",
        name: "max-w-14 sm:max-w-32 text-xs sm:text-base",
        count: "text-xs sm:text-lg",
    },
    {
        medal: "🥉",
        order: "order-3",
        medalWrap: "size-10 sm:size-20",
        medalText: "text-3xl sm:text-6xl",
        avatar: "size-8 sm:size-14",
        name: "max-w-14 sm:max-w-32 text-xs sm:text-base",
        count: "text-xs sm:text-lg",
    },
] as const;

type PodiumUser = { id: number; username: string; avatar?: string | null; value: number };

function Podium({ top, label }: { top: PodiumUser[]; label: string }) {
    const slots = PODIUM_SLOTS.map((slot, i) => ({ slot, user: top[i] })).filter((s) => s.user);
    return (
        <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-6">
            {slots.map(({ slot, user }) => (
                <div key={slot.medal} className={`flex flex-col items-center ${slot.order}`}>
                    <div className={`mb-1 sm:mb-3 flex items-center justify-center ${slot.medalWrap}`}>
                        <span className={slot.medalText}>{slot.medal}</span>
                    </div>
                    <Link to={`/users/${user.id}`} className="w-full">
                        <Card className="relative w-full overflow-hidden py-4 sm:py-10">
                            <CardContent className="min-w-0 w-full px-2 sm:px-8 text-center">
                                <Avatar className={`mx-auto mb-1 sm:mb-3 ${slot.avatar}`}>
                                    {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
                                    <AvatarFallback>{user.username.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className={`mb-0.5 sm:mb-2 truncate mx-auto font-semibold ${slot.name}`}>
                                    {user.username}
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-1">
                                    <span className="text-[10px] sm:text-sm text-muted-foreground">{label}</span>
                                    <span className={`font-bold ${slot.count}`}>{user.value}</span>
                                </div>
                            </CardContent>
                            {beamLayer("1px", "via-red-500", "79.2667%")}
                            {beamLayer("2px", "via-blue-500", "29.2667%")}
                        </Card>
                    </Link>
                </div>
            ))}
        </div>
    );
}

function rankColor(rank: number): string {
    if (rank === 1) return "text-amber-500";
    if (rank === 2) return "text-slate-400";
    if (rank === 3) return "text-orange-600";
    return "text-muted-foreground";
}

function RankBadge({ rank, label, value }: { rank: number; label: string; value: number }) {
    return (
        <span
            className={`flex h-6 min-w-9 items-center justify-center rounded-md bg-muted px-1.5 text-xs font-semibold ${rankColor(rank)}`}
        >
            第{rank}名 · {label}：{value}
        </span>
    );
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

function FollowersTab({ tab, title }: { tab: TabData<FollowUser>; title: string }) {
    const { load, initialized } = tab;
    useEffect(() => {
        if (!initialized) void load(true);
    }, [load, initialized]);

    if (tab.loading) return <SkeletonList />;
    if (tab.error) return <Empty text={tab.error} />;
    if (tab.hidden) return <Empty text="该用户将关注列表设置为私密，无法查看" />;
    if (tab.items.length === 0) return <Empty text={`还没有${title}`} />;
    const top = tab.items.slice(0, 3);
    const topIds = new Set(top.map((u) => u.id));
    return (
        <>
            <Podium
                top={top.map((u) => ({ id: u.id, username: u.username, avatar: u.avatar, value: u.followers }))}
                label="粉丝"
            />
            <div className="grid gap-1">
                {tab.items
                    .filter((u) => !topIds.has(u.id))
                    .map((user) => (
                        <UserRow
                            key={user.id}
                            user={user}
                            onFollowChange={(updated) =>
                                tab.updateItems((items) => items.map((u) => (u.id === updated.id ? updated : u)))
                            }
                        >
                            {user.rank != null ? (
                                <RankBadge rank={user.rank} label="粉丝" value={user.followers} />
                            ) : null}
                        </UserRow>
                    ))}
                <div className="pt-2">
                    <LoadMore tab={tab} />
                </div>
            </div>
        </>
    );
}

function PostPointsTab({ tab, title }: { tab: TabData<PointsUser>; title: string }) {
    const { load, initialized } = tab;
    useEffect(() => {
        if (!initialized) void load(true);
    }, [load, initialized]);

    if (tab.loading) return <SkeletonList />;
    if (tab.error) return <Empty text={tab.error} />;
    if (tab.items.length === 0) return <Empty text={`还没有${title}`} />;
    const top = tab.items.slice(0, 3);
    const topIds = new Set(top.map((u) => u.id));
    return (
        <>
            <Podium
                top={top.map((u) => ({ id: u.id, username: u.username, avatar: u.avatar, value: u.points }))}
                label="积分"
            />
            <div className="grid gap-1">
                {tab.items
                    .filter((u) => !topIds.has(u.id))
                    .map((user) => (
                        <UserRow
                            key={user.id}
                            user={user}
                            onFollowChange={(updated) =>
                                tab.updateItems((items) => items.map((u) => (u.id === updated.id ? updated : u)))
                            }
                        >
                            {user.rank != null ? <RankBadge rank={user.rank} label="积分" value={user.points} /> : null}
                        </UserRow>
                    ))}
                <div className="pt-2">
                    <LoadMore tab={tab} />
                </div>
            </div>
        </>
    );
}

function RankTabs() {
    const [myRank, setMyRank] = useState<number | null>(null);
    const [myPointsRank, setMyPointsRank] = useState<number | null>(null);
    const followers = useTab(
        useCallback(async (offset) => {
            const res = await rankUsersByFollowers({ limit: LIMIT, offset });
            setMyRank(res.my_rank);
            return { items: res.users, hasMore: res.users.length === LIMIT, hidden: false };
        }, []),
    );
    const points = useTab(
        useCallback(async (offset) => {
            const res = await rankUsersByPostPoints({ limit: LIMIT, offset });
            setMyPointsRank(res.my_rank);
            return { items: res.users, hasMore: res.users.length === LIMIT, hidden: false };
        }, []),
    );

    return (
        <Tabs defaultValue="followers" className="w-full">
            <TabsList className="w-full">
                <TabsTrigger value="followers" className="flex-1">
                    粉丝排名
                </TabsTrigger>
                <TabsTrigger value="points" className="flex-1">
                    帖子积分排名
                </TabsTrigger>
            </TabsList>
            <TabsContent value="followers" className="pt-4">
                <FollowersTab tab={followers} title="粉丝" />
                {myRank != null && (
                    <Card className="mt-4">
                        <CardContent className="flex items-center justify-center gap-2 py-4">
                            <span className="text-sm text-muted-foreground">我的粉丝排名</span>
                            <span className={`text-lg font-bold ${rankColor(myRank)}`}>第 {myRank} 名</span>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
            <TabsContent value="points" className="pt-4">
                <PostPointsTab tab={points} title="帖子积分" />
                {myPointsRank != null && (
                    <Card className="mt-4">
                        <CardContent className="flex items-center justify-center gap-2 py-4">
                            <span className="text-sm text-muted-foreground">我的积分排名</span>
                            <span className={`text-lg font-bold ${rankColor(myPointsRank)}`}>第 {myPointsRank} 名</span>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
    );
}

export default function RankPage() {
    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <RankTabs />
        </div>
    );
}
