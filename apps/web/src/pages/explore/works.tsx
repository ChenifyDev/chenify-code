import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, Flame, Loader2, Compass } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { listWorks, type WorkSummary } from "@/lib/api.ts";
import { WorkCard } from "@/components/works/WorkCard.tsx";

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

function Feed({ sort }: { sort: Sort }) {
    const [items, setItems] = useState<WorkSummary[]>([]);
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
            const list = await listWorks({ offset: offsetRef.current, limit: LIMIT, sort });
            setHasMore(list.length === LIMIT);
            setItems((prev) => [...prev, ...list]);
            offsetRef.current += list.length;
        } catch (err) {
            setError(err instanceof Error ? err.message : "加载失败");
        } finally {
            setLoadingMore(false);
            setLoading(false);
        }
    }, [sort]);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        void load();
    }, [load]);

    if (loading) return <SkeletonList />;
    if (error) return <Empty text={error} />;
    if (items.length === 0) return <Empty text="这里还空空如也" />;
    return (
        <div className="m-4 columns-3 sm:columns-2 md:columns-4 lg:columns-4 gap-4 space-y-2">
            {items.map((work) => (
                <WorkCard work={work} key={work.id} className={"break-inside-avoid"} />
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

export default function Works() {
    const [sort, setSort] = useState<Sort>("hot");

    return (
        <div className="mx-auto w-full p-4 md:p-6">
            <header className="mb-4">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <Compass className="size-5" />
                    作品
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">按热度或时间浏览社区里的好作品</p>
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

            <Feed key={sort} sort={sort} />
        </div>
    );
}
