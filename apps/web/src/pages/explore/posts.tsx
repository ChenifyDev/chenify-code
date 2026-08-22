import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, Flame, Loader2, Signpost } from "lucide-react";

import PostCard from "@/components/forum/PostCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { listPosts, listTags, type Post } from "@/lib/api.ts";
import { cn } from "@/lib/utils.ts";

type Sort = "hot" | "latest";

const LIMIT = 10;

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

function Feed({ sort, tag }: { sort: Sort; tag: string | null }) {
    const [items, setItems] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const offsetRef = useRef(0);
    const startedRef = useRef(false);

    const load = useCallback(async () => {
        setLoadingMore(true);
        setError(null);
        try {
            const list = await listPosts({ offset: offsetRef.current, limit: LIMIT, tag, sort });
            setHasMore(list.length === LIMIT);
            setItems((prev) => [...prev, ...list]);
            offsetRef.current += list.length;
        } catch (err) {
            setError(err instanceof Error ? err.message : "加载失败");
        } finally {
            setLoadingMore(false);
            setLoading(false);
        }
    }, [sort, tag]);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        void load();
    }, [load]);

    if (loading) return <SkeletonList />;
    if (error) return <Empty text={error} />;
    if (items.length === 0) return <Empty text="这里还空空如也" />;
    return (
        <div className="grid gap-3">
            {items.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
            {hasMore && (
                <Button variant="outline" className="w-full" disabled={loadingMore} onClick={() => void load()}>
                    {loadingMore && <Loader2 className="animate-spin" />}
                    {loadingMore ? "加载中…" : "加载更多"}
                </Button>
            )}
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

export default function Posts() {
    const [sort, setSort] = useState<Sort>("hot");
    const [tag, setTag] = useState<string | null>(null);
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        listTags()
            .then(setTags)
            .catch(() => {});
    }, []);

    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <header className="mb-4">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <Signpost className="size-5" />
                    帖子
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">按热度或时间浏览社区里的好内容</p>
            </header>

            <div className="mb-3 flex items-center gap-2">
                <Button size="sm" variant={sort === "hot" ? "default" : "outline"} onClick={() => setSort("hot")}>
                    <Flame />
                    热门
                </Button>
                <Button size="sm" variant={sort === "latest" ? "default" : "outline"} onClick={() => setSort("latest")}>
                    <Clock />
                    最新
                </Button>
            </div>

            {tags.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <button
                        className={cn(
                            "rounded-md px-2 py-0.5 text-xs",
                            tag === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                        onClick={() => setTag(null)}
                    >
                        全部
                    </button>
                    {tags.map((t) => (
                        <button
                            key={t}
                            className={cn(
                                "rounded-md px-2 py-0.5 text-xs",
                                tag === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            )}
                            onClick={() => setTag(tag === t ? null : t)}
                        >
                            #{t}
                        </button>
                    ))}
                </div>
            )}

            <Feed key={`${sort}:${tag ?? ""}`} sort={sort} tag={tag} />
        </div>
    );
}
