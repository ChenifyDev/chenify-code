import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import type { TabData } from "@/types/tab.ts";

/**
 * 统一的分页列表 Hook。帖子流、排行榜、搜索、通知、个人空间 tab 等都用它承载
 * "首次加载 + 加载更多" 的逻辑，约定返回 TabData<T>（与 types/tab.ts 对齐）。
 *
 * 重点约定：
 * - offset 由"已返回条数"累加推算（offsetRef），因此 fetcher 在还有更多数据时
 *   必须返回恰好 limit 条，否则 hasMore / 分页位置会错位。
 * - load(reset) 双语义：reset=true 从头加载并覆盖 items；否则追加 items。
 * - hidden 用于"该列表被设为私密"的场景，由 tab 渲染层读取并显示提示。
 */
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
    // startedRef：autoStart 场景下保证初始加载只触发一次（React StrictMode 会双调用 effect）
    const startedRef = useRef(false);
    // initializedRef：与 startedRef 不同，只有显式调用 load(true) 才置位，
    // 供惰性 tab（profile/rank）用 `if (!initialized) void load(true)` 按需首次加载。
    const initializedRef = useRef(false);
    const [initialized, setInitialized] = useState(false);

    const load = useCallback(
        async (reset = false) => {
            // reset 时进入整页 loading（新增首屏骨架屏）；追加时仅锁定"加载更多"按钮
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