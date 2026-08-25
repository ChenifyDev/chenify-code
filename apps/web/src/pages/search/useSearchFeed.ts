import { useCallback, useEffect, useRef, useState } from "react";

export function useSearchFeed<T>(
    fetcher: (offset: number, limit: number) => Promise<{ items: T[]; hasMore: boolean }>,
    limit: number,
) {
    const [items, setItems] = useState<T[]>([]);
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
            const res = await fetcher(offsetRef.current, limit);
            setHasMore(Boolean(res.hasMore));
            setItems((prev) => [...prev, ...res.items]);
            offsetRef.current += res.items.length;
        } catch (err) {
            setError(err instanceof Error ? err.message : "加载失败");
        } finally {
            setLoadingMore(false);
            setLoading(false);
        }
    }, [fetcher, limit]);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        void load();
    }, [load]);

    return { items, loading, loadingMore, hasMore, error, load, setItems };
}
