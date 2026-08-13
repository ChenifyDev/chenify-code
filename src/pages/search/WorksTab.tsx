import { useCallback } from "react";

import { searchWorks, type WorkSummary } from "@/lib/api.ts";
import { WorkCard } from "@/components/works/WorkCard.tsx";

import { Empty, LoadMore, SkeletonList } from "@/pages/search/common.tsx";
import { useSearchFeed } from "@/pages/search/useSearchFeed.ts";

const LIMIT = 10;

export default function WorksTab({ keyword, sort }: { keyword: string; sort: "hot" | "latest" }) {
    const fetcher = useCallback(
        (offset: number, limit: number) => searchWorks({ offset, limit, sort, keyword }),
        [keyword, sort],
    );
    const { items, loading, loadingMore, hasMore, error, load } = useSearchFeed<WorkSummary>(fetcher, LIMIT);

    if (loading)
        return <SkeletonList className="m-4 columns-3 gap-4 space-y-2 sm:columns-2 md:columns-4 lg:columns-4" />;
    if (error) return <Empty text={error} />;
    if (items.length === 0) return <Empty text="没有找到相关作品" />;
    return (
        <div className="m-4 columns-3 gap-4 space-y-2 sm:columns-2 md:columns-4 lg:columns-4">
            {items.map((work) => (
                <WorkCard key={work.id} work={work} className="break-inside-avoid" />
            ))}
            {hasMore && <LoadMore loading={loadingMore} onClick={() => void load()} />}
        </div>
    );
}
