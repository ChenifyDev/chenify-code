import type { Draft } from "@/lib/api";
import { parseFrontmatter } from "@/lib/frontmatter";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button.tsx";
import { EyeOff, Loader2, Pencil, Send, Trash2 } from "lucide-react";

export function DraftItem({
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
    const { title, body } = parseFrontmatter(draft.content);
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

                {title && <p className="text-sm font-semibold">{title}</p>}
                <p className="whitespace-pre-wrap text-sm">
                    {body || <span className="text-muted-foreground">（无内容）</span>}
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
