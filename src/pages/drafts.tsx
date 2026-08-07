import { useCallback, useEffect, useRef, useState } from "react";
import { EyeOff, FileText, Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { deleteDraft, listDrafts, publishDraft, unpublishDraft, type Draft } from "@/lib/api.ts";
import { formatDateTime } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser.ts";

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

function DraftItem({
    draft,
    busy,
    onEdit,
    onPublish,
    onUnpublish,
    onDelete,
}: {
    draft: Draft;
    busy: boolean;
    onEdit: (draft: Draft) => void;
    onPublish: (draft: Draft) => void;
    onUnpublish: (draft: Draft) => void;
    onDelete: (draft: Draft) => void;
}) {
    const published = draft.status === "published";
    return (
        <Card size="sm">
            <CardContent className="grid gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
                            published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}
                    >
                        {published ? "已发布" : "草稿"}
                    </span>
                    <span className="shrink-0">{formatDateTime(draft.updated_at)}</span>
                </div>

                <p className="whitespace-pre-wrap text-sm">
                    {draft.content || <span className="text-muted-foreground">（无内容）</span>}
                </p>

                {draft.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {draft.images.map((src, i) => (
                            <img key={i} src={src} alt={`图片 ${i + 1}`} className="size-16 rounded-md object-cover" />
                        ))}
                    </div>
                )}

                {draft.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {draft.tags.map((tag) => (
                            <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => onEdit(draft)}>
                        <Pencil />
                        编辑
                    </Button>
                    {published ? (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onUnpublish(draft)}>
                            <EyeOff />
                            取消发布
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="default"
                            disabled={busy || !draft.content}
                            onClick={() => onPublish(draft)}
                        >
                            {busy ? <Loader2 className="animate-spin" /> : <Send />}
                            发布
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="destructive"
                        className="ml-auto"
                        disabled={busy}
                        onClick={() => onDelete(draft)}
                    >
                        <Trash2 />
                        删除
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function DraftList() {
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

export default function Drafts() {
    const me = useUserStore((s) => s.user);
    const navigate = useNavigate();

    useEffect(() => {
        if (!me) navigate("/login");
    }, [me, navigate]);

    if (!me) return null;

    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <header className="mb-4">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <FileText className="size-5" />
                    草稿管理
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">管理你的未发布内容和已发布的文章</p>
            </header>

            <DraftList />
        </div>
    );
}
