import { useCallback, useEffect, useRef, useState } from "react";
import { listFollowingPosts, type Post } from "@/lib/api";
import Empty from "@/components/tab/Empty";
import SkeletonList from "@/components/forum/SkeletonList.tsx";
import PostCard from "@/components/forum/PostCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Loader2, Signpost } from "lucide-react";

const LIMIT = 5;

export function Home() {
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
            const list = await listFollowingPosts({ offset: offsetRef.current, limit: LIMIT });
            setHasMore(Boolean(list.hasMore));
            setItems((prev) => [...prev, ...list.posts]);
            offsetRef.current += list.posts.length;
        } catch (err) {
            setError(err instanceof Error ? err.message : "加载失败");
        } finally {
            setLoadingMore(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        void load();
    }, [load]);

    if (loading) return <SkeletonList />;
    if (error) return <Empty text={error} />;
    if (items.length === 0) return <Empty text="这里还空空如也" />;

    return (
        <div className="mx-auto w-full max-w-3xl px-4">
            <header className="mb-4">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <Signpost className="size-5" />
                    我的关注
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">查看你关注的用户的动态</p>
            </header>
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
        </div>
    );
}
