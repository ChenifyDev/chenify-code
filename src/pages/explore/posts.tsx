import { useCallback, useEffect, useState } from "react";
import { Clock, Flame, Signpost } from "lucide-react";

import PostCard from "@/components/forum/PostCard.tsx";
import LoadMore from "@/components/tab/LoadMore.tsx";
import { Button } from "@/components/ui/button.tsx";
import { listPosts, listTags, type Post } from "@/lib/api";
import { cn } from "@/lib/utils.ts";
import { useInfiniteList } from "@/hooks/useInfiniteList.ts";
import Empty from "@/components/tab/Empty.tsx";
import SkeletonList from "@/components/forum/SkeletonList.tsx";

type Sort = "hot" | "latest";

const LIMIT = 10;

function Feed({ sort, tag }: { sort: Sort; tag: string | null }) {
    const feed = useInfiniteList<Post>({
        fetcher: useCallback(
            async (offset) => {
                const res = await listPosts({ offset, limit: LIMIT, tag, sort });
                return { items: res.items, hasMore: res.hasMore, hidden: false };
            },
            [sort, tag],
        ),
        limit: LIMIT,
    });

    if (feed.loading) return <SkeletonList />;
    if (feed.error) return <Empty text={feed.error} />;
    if (feed.items.length === 0) return <Empty text="这里还空空如也" />;
    return (
        <div className="grid gap-3">
            {feed.items.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
            {feed.hasMore && <LoadMore loading={feed.loadingMore} onClick={() => void feed.load()} />}
        </div>
    );
}

export default function Posts() {
    const [sort, setSort] = useState<Sort>("hot");
    const [tag, setTag] = useState<string | null>(null);
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        listTags()
            .then(setTags)
            .catch(() => {});
    }, []);

    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <header className="mb-4">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <Signpost className="size-5" />
                    帖子
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">按热度或时间浏览社区里的好内容</p>
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

            {tags.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <button
                        className={cn(
                            "rounded-md px-2 py-0.5 text-xs",
                            tag === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                        onClick={() => setTag(null)}
                    >
                        全部
                    </button>
                    {tags.map((t) => (
                        <button
                            key={t}
                            className={cn(
                                "rounded-md px-2 py-0.5 text-xs",
                                tag === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            )}
                            onClick={() => setTag(tag === t ? null : t)}
                        >
                            #{t}
                        </button>
                    ))}
                </div>
            )}

            <Feed key={`${sort}:${tag ?? ""}`} sort={sort} tag={tag} />
        </div>
    );
}
