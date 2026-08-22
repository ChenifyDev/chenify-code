import { useCallback, useEffect, useRef, useState } from "react";
import { DraftItem } from "@/components/forum/drafts/DraftItem.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { deleteDraft, listDrafts, publishDraft, unpublishDraft, type Draft } from "@/lib/api.ts";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";

type DraftStatus = "all" | "draft" | "published";

const LIMIT = 10;

function SkeletonList() {
    return (
        <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} size="sm">
                    <CardContent className="grid gap-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function DraftList() {
    const [status, setStatus] = useState<DraftStatus>("all");
    const [items, setItems] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const offsetRef = useRef(0);
    const navigate = useNavigate();

    const reload = useCallback(async () => {
        offsetRef.current = 0;
        setLoading(true);
        setError(null);
        try {
            const list = await listDrafts(status === "all" ? undefined : status, 0, LIMIT);
            setItems(list);
            setHasMore(list.length === LIMIT);
        } catch (err) {
            setError(err instanceof Error ? err.message : "加载失败");
        } finally {
            setLoading(false);
        }
    }, [status]);

    const loadMore = useCallback(async () => {
        setLoadingMore(true);
        setError(null);
        try {
            const list = await listDrafts(status === "all" ? undefined : status, offsetRef.current, LIMIT);
            setItems((prev) => [...prev, ...list]);
            offsetRef.current += list.length;
            setHasMore(list.length === LIMIT);
        } catch (err) {
            setError(err instanceof Error ? err.message : "加载失败");
        } finally {
            setLoadingMore(false);
        }
    }, [status]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const runAction = async (
        draft: Draft,
        action: (id: number) => Promise<unknown>,
        end: (prev: Draft[], result: unknown) => Draft[],
    ) => {
        setBusyId(draft.id);
        setError(null);
        try {
            const result = await action(draft.id);
            setItems((prev) => end(prev, result));
        } catch (err) {
            setError(err instanceof Error ? err.message : "操作失败");
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
                {loading ? (
                    <SkeletonList />
                ) : (
                    <div className="grid gap-3">
                        {error && <p className="text-sm text-muted-foreground">{error}</p>}
                        {items.length === 0 ? (
                            <Card>
                                <CardContent className="grid justify-items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                                    <FileText className="size-6" />
                                    暂无草稿
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {items.map((draft) => (
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
                                {hasMore && (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        disabled={loadingMore}
                                        onClick={() => void loadMore()}
                                    >
                                        {loadingMore && <Loader2 className="animate-spin" />}
                                        {loadingMore ? "加载中…" : "加载更多"}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
