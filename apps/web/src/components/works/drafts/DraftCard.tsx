import type { WorkDraft } from "@/lib/api.ts";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { EyeOff, Pencil, Send, Trash2 } from "lucide-react";

export const DraftCard = ({
    work,
    className,
    busy,
    onPublish,
    onUnpublish,
    onEdit,
    onDelete,
}: {
    work: WorkDraft;
    className?: string;
    busy: boolean;
    onEdit: (draft: WorkDraft) => void;
    onPublish: (draft: WorkDraft) => void;
    onUnpublish: (draft: WorkDraft) => void;
    onDelete: (draft: WorkDraft) => void;
}) => {
    const workUrl = `/works/${work.id}`;
    const published = work.status !== "draft";

    return (
        <Card className={`relative overflow-hidden ${className || ""}`}>
            <img
                alt={work.title}
                src={work.cover}
                className={published ? "cursor-pointer" : ""}
                onClick={published ? () => window.open(workUrl, "_blank") : () => {}}
            />

            <CardHeader>
                <CardAction>
                    <Badge
                        className={
                            !published
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }
                    >
                        {!published ? "未发布" : "已发布"}
                    </Badge>
                </CardAction>
                {published ? (
                    <Link to={workUrl} target="_blank" rel="noopener noreferrer">
                        <CardTitle>{work.title}</CardTitle>
                    </Link>
                ) : (
                    <CardTitle>{work.title}</CardTitle>
                )}
                <CardDescription className="mt-2">{work.description}</CardDescription>
            </CardHeader>

            <CardFooter className="flex justify-between items-center">
                <CardAction className={"flex gap-2"}>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => onEdit(work)}>
                        <Pencil />
                        编辑
                    </Button>
                </CardAction>
                <CardAction className={"flex gap-2"}>
                    {published ? (
                        <Button
                            size="icon-sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => onUnpublish(work)}
                            aria-label={"取消发布"}
                        >
                            <EyeOff />
                        </Button>
                    ) : (
                        <Button size="icon-sm" disabled={busy} onClick={() => onPublish(work)} aria-label={"发布"}>
                            <Send />
                        </Button>
                    )}
                    <Button
                        size="icon-sm"
                        variant="destructive"
                        className="ml-auto"
                        disabled={busy}
                        onClick={() => onDelete(work)}
                    >
                        <Trash2 />
                    </Button>
                </CardAction>
            </CardFooter>
        </Card>
    );
};
