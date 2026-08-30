import { useCallback, useEffect, useState } from "react";
import { DraftItem } from "@/components/forum/drafts/DraftItem.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { deleteDraft, listDrafts, publishDraft, unpublishDraft, type Draft } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { useInfiniteList } from "@/hooks/useInfiniteList.ts";
import LoadMore from "@/components/tab/LoadMore.tsx";
import SkeletonList from "@/components/forum/SkeletonList.tsx";

type DraftStatus = "all" | "draft" | "published";

const LIMIT = 10;

export default function DraftList() {
    const [status, setStatus] = useState<DraftStatus>("all");
    const [busyId, setBusyId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const navigate = useNavigate();

    const feed = useInfiniteList<Draft>({
        fetcher: useCallback(
            async (offset) => {
                const res = await listDrafts(status === "all" ? undefined : status, offset, LIMIT);
                return { items: res.items, hasMore: res.hasMore, hidden: false };
            },
            [status],
        ),
        limit: LIMIT,
        autoStart: false,
    });

    const { load } = feed;

    useEffect(() => {
        setActionError(null);
        void load(true);
    }, [load]);

    const runAction = async (
        draft: Draft,
        action: (id: number) => Promise<unknown>,
        end: (prev: Draft[], result: unknown) => Draft[],
    ) => {
        setBusyId(draft.id);
        setActionError(null);
        try {
            const result = await action(draft.id);
            feed.setItems((prev) => end(prev, result));
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "操作失败");
        } finally {
            setBusyId(null);
        }
    };

    const handlePublish = (draft: Draft) =>
        runAction(draft, publishDraft, (prev) =>
            prev.map((d) => (d.id === draft.id ? { ...d, status: "published" as const } : d)),
        );

    const handleUnpublish = (draft: Draft) =>
        runAction(draft, unpublishDraft, (prev) =>
            prev.map((d) => (d.id === draft.id ? { ...d, status: "draft" as const } : d)),
        );

    const handleDelete = (draft: Draft) => {
        if (!window.confirm("确定删除这条草稿吗？")) return;
        void runAction(draft, deleteDraft, (prev) => prev.filter((d) => d.id !== draft.id));
    };

    const handleEdit = (draft: Draft) => {
        navigate(`/write?id=${draft.id}`);
    };

    const error = feed.error ?? actionError;

    return (
        <Tabs value={status} onValueChange={(value) => setStatus(value as DraftStatus)} className="w-full">
            <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">
                    全部
                </TabsTrigger>
                <TabsTrigger value="draft" className="flex-1">
                    未发布
                </TabsTrigger>
                <TabsTrigger value="published" className="flex-1">
                    已发布
                </TabsTrigger>
            </TabsList>
            <TabsContent value={status} className="pt-4">
                {feed.loading ? (
                    <SkeletonList />
                ) : (
                    <div className="grid gap-3">
                        {error && <p className="text-sm text-muted-foreground">{error}</p>}
                        {feed.items.length === 0 ? (
                            <Card>
                                <CardContent className="grid justify-items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                                    <FileText className="size-6" />
                                    暂无草稿
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {feed.items.map((draft) => (
                                    <DraftItem
                                        key={draft.id}
                                        draft={draft}
                                        busy={busyId === draft.id}
                                        onEdit={handleEdit}
                                        onPublish={handlePublish}
                                        onUnpublish={handleUnpublish}
                                        onDelete={handleDelete}
                                    />
                                ))}
                                {feed.hasMore && (
                                    <LoadMore loading={feed.loadingMore} onClick={() => void feed.load()} />
                                )}
                            </>
                        )}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}