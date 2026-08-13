import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { deleteWorkDraft, listWorkDrafts, type WorkDraft, unpublishWorkDraft } from "@/lib/api.ts";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { DraftCard } from "@/components/works/drafts/DraftCard.tsx";
import { PublishDraftModal } from "@/components/works/drafts/PublishDraftModal.tsx";

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
    const [items, setItems] = useState<WorkDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [publishingDraft, setPublishingDraft] = useState<WorkDraft | null>(null);
    const offsetRef = useRef(0);
    const navigate = useNavigate();

    const reload = useCallback(async () => {
        offsetRef.current = 0;
        setLoading(true);
        setError(null);
        try {
            const list = await listWorkDrafts(status === "all" ? undefined : status, 0, LIMIT);
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
            const list = await listWorkDrafts(status === "all" ? undefined : status, offsetRef.current, LIMIT);
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

    const draftIdOf = (draft: WorkDraft): number => draft.draft_id ?? draft.id;

    const entryKeyOf = (draft: WorkDraft): string =>
        draft.status === "published" ? `w${draft.work_id}` : `d${draft.id}`;

    const runAction = async (
        draft: WorkDraft,
        action: (id: number) => Promise<unknown>,
        end: (prev: WorkDraft[], result: unknown) => WorkDraft[],
    ) => {
        setBusyKey(entryKeyOf(draft));
        setError(null);
        try {
            const result = await action(draftIdOf(draft));
            setItems((prev) => end(prev, result));
        } catch (err) {
            setError(err instanceof Error ? err.message : "操作失败");
        } finally {
            setBusyKey(null);
        }
    };

    const handlePublish = (draft: WorkDraft) => setPublishingDraft(draft);

    const handleUnpublish = (draft: WorkDraft) =>
        runAction(draft, unpublishWorkDraft, (prev) =>
            prev.map((d) =>
                entryKeyOf(d) === entryKeyOf(draft)
                    ? { ...d, id: draftIdOf(d), status: "draft" as const, work_id: null }
                    : d,
            ),
        );

    const handleDelete = (draft: WorkDraft) => {
        if (!window.confirm("确定删除这条草稿吗？")) return;
        void runAction(draft, deleteWorkDraft, (prev) => prev.filter((d) => entryKeyOf(d) !== entryKeyOf(draft)));
    };

    const handleEdit = (draft: WorkDraft) => {
        navigate(`/write?id=${draftIdOf(draft)}`);
    };

    return (
        <>
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
                                    <div
                                        className={
                                            "m-4 columns-3 sm:columns-2 md:columns-4 lg:columns-4 gap-4 space-y-2"
                                        }
                                    >
                                        {items.map((draft) => (
                                            <DraftCard
                                                work={draft}
                                                key={entryKeyOf(draft)}
                                                busy={busyKey === entryKeyOf(draft)}
                                                onPublish={handlePublish}
                                                onUnpublish={handleUnpublish}
                                                onDelete={handleDelete}
                                                onEdit={handleEdit}
                                            />
                                        ))}
                                    </div>
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
            <PublishDraftModal
                draft={publishingDraft}
                onOpenChange={(open) => {
                    if (!open) setPublishingDraft(null);
                }}
                onPublished={(work) => {
                    setItems((prev) =>
                        prev.map((d) =>
                            entryKeyOf(d) === entryKeyOf(publishingDraft!)
                                ? {
                                      ...d,
                                      status: "published" as const,
                                      work_id: work.id,
                                      draft_id: d.id,
                                  }
                                : d,
                        ),
                    );
                    setPublishingDraft(null);
                }}
            />
        </>
    );
}
