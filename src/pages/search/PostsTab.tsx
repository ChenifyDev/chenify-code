import { useCallback } from "react";

import PostCard from "@/components/forum/PostCard.tsx";
import { searchPosts, type Post } from "@/lib/api";

import Empty from "@/components/tab/Empty.tsx";
import SkeletonList from "@/components/forum/SkeletonList.tsx";
import LoadMore from "@/components/tab/LoadMore.tsx";
import { useInfiniteList } from "@/hooks/useInfiniteList.ts";

const LIMIT = 10;

export default function PostsTab({ keyword, sort }: { keyword: string; sort: "hot" | "latest" }) {
    const feed = useInfiniteList<Post>({
        fetcher: useCallback(
            async (offset, limit) => {
                const res = await searchPosts({ offset, limit, sort, keyword });
                return { items: res.items, hasMore: res.hasMore, hidden: false };
            },
            [keyword, sort],
        ),
        limit: LIMIT,
    });

    if (feed.loading) return <SkeletonList />;
    if (feed.error) return <Empty text={feed.error} />;
    if (feed.items.length === 0) return <Empty text="没有找到相关帖子" />;
    return (
        <div className="grid gap-3">
            {feed.items.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
            {feed.hasMore && <LoadMore loading={feed.loadingMore} onClick={() => void feed.load()} />}
        </div>
    );
}