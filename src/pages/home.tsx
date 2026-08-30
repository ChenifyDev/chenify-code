import { useCallback } from "react";
import { listFollowingPosts, type Post } from "@/lib/api";
import Empty from "@/components/tab/Empty";
import LoadMore from "@/components/tab/LoadMore";
import SkeletonList from "@/components/forum/SkeletonList.tsx";
import PostCard from "@/components/forum/PostCard.tsx";
import { useInfiniteList } from "@/hooks/useInfiniteList.ts";
import { Signpost } from "lucide-react";

const LIMIT = 5;

export function Home() {
    const feed = useInfiniteList<Post>({
        fetcher: useCallback(async (offset) => {
            const list = await listFollowingPosts({ offset, limit: LIMIT });
            return { items: list.posts, hasMore: list.hasMore, hidden: false };
        }, []),
        limit: LIMIT,
    });

    if (feed.loading) return <SkeletonList />;
    if (feed.error) return <Empty text={feed.error} />;
    if (feed.items.length === 0) return <Empty text="这里还空空如也" />;

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
                {feed.items.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
                {feed.hasMore && <LoadMore loading={feed.loadingMore} onClick={() => void feed.load()} />}
            </div>
        </div>
    );
}
