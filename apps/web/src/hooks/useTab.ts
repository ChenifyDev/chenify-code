import { useCallback, useRef, useState } from "react";
import type { TabData } from "@/types/tab.ts";

export default function useTab<T>(
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
