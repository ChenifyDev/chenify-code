import { useCallback } from "react";

import PostCard from "@/components/forum/PostCard.tsx";
import { searchPosts, type Post } from "@/lib/api.ts";

import { Empty, LoadMore, SkeletonList } from "@/pages/search/common.tsx";
import { useSearchFeed } from "@/pages/search/useSearchFeed.ts";

const LIMIT = 10;

export default function PostsTab({ keyword, sort }: { keyword: string; sort: "hot" | "latest" }) {
    const fetcher = useCallback(
        (offset: number, limit: number) => searchPosts({ offset, limit, sort, keyword }),
        [keyword, sort],
    );
    const { items, loading, loadingMore, hasMore, error, load } = useSearchFeed<Post>(fetcher, LIMIT);

    if (loading) return <SkeletonList />;
    if (error) return <Empty text={error} />;
    if (items.length === 0) return <Empty text="没有找到相关帖子" />;
    return (
        <div className="grid gap-3">
            {items.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
            {hasMore && <LoadMore loading={loadingMore} onClick={() => void load()} />}
        </div>
    );
}
