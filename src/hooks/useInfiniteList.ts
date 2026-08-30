import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import type { TabData } from "@/types/tab.ts";

type InfiniteListResult<T> = {
    items: T[];
    hasMore: boolean;
    hidden?: boolean;
};

export function useInfiniteList<T>({
    fetcher,
    limit = 20,
    autoStart = true,
}: {
    fetcher: (offset: number, limit: number) => Promise<InfiniteListResult<T>>;
    limit?: number;
    autoStart?: boolean;
}): TabData<T> & { setItems: Dispatch<SetStateAction<T[]>> } {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(autoStart);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const offsetRef = useRef(0);
    const startedRef = useRef(false);
    const initializedRef = useRef(false);
    const [initialized, setInitialized] = useState(false);

    const load = useCallback(
        async (reset = false) => {
            if (reset) {
                initializedRef.current = true;
                setInitialized(true);
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError(null);
            try {
                const offset = reset ? 0 : offsetRef.current;
                const res = await fetcher(offset, limit);
                setHidden(Boolean(res.hidden));
                setHasMore(Boolean(res.hasMore));
                setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
                offsetRef.current = (reset ? 0 : offsetRef.current) + res.items.length;
            } catch (err) {
                setError(err instanceof Error ? err.message : "加载失败");
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [fetcher, limit],
    );

    useEffect(() => {
        if (!autoStart) return;
        if (startedRef.current) return;
        startedRef.current = true;
        void load();
    }, [autoStart, load]);

    const updateItems = useCallback((updater: (items: T[]) => T[]) => setItems(updater), []);

    return { items, loading, loadingMore, hasMore, hidden, error, initialized, load, updateItems, setItems };
}