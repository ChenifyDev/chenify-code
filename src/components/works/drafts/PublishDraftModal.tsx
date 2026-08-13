import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { publishWorkDraft, updateWorkDraft, type WorkDetail, type WorkDraft } from "@/lib/api.ts";
import { CoverCropper } from "@/components/works/drafts/CoverCropper.tsx";

const MAX_TITLE = 100;
const MAX_DESC = 5000;

export function PublishDraftModal({
    draft,
    onOpenChange,
    onPublished,
}: {
    draft: WorkDraft | null;
    onOpenChange: (open: boolean) => void;
    onPublished: (work: WorkDetail) => void;
}) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [editing, setEditing] = useState(false);
    const [pickedUrl, setPickedUrl] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const open = draft != null;

    useEffect(() => {
        if (!draft) return;
        setTitle(draft.title);
        setDescription(draft.description);
        setCoverPreview(null);
        setCoverFile(null);
        setEditing(false);
        setPickedUrl(null);
        setError(null);
        setPublishing(false);
    }, [draft]);

    useEffect(
        () => () => {
            if (pickedUrl) URL.revokeObjectURL(pickedUrl);
        },
        [pickedUrl],
    );

    useEffect(
        () => () => {
            if (coverPreview) URL.revokeObjectURL(coverPreview);
        },
        [coverPreview],
    );

    if (!draft) return null;

    const currentCover = coverPreview ?? draft.cover;
    const canPublish = title.trim().length > 0 && (coverFile != null || draft.cover.length > 0);

    const handlePickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (pickedUrl) URL.revokeObjectURL(pickedUrl);
        setPickedUrl(URL.createObjectURL(file));
        setEditing(true);
    };

    const handleCropConfirm = (file: File) => {
        const url = URL.createObjectURL(file);
        setCoverFile(file);
        setCoverPreview(url);
        if (pickedUrl) URL.revokeObjectURL(pickedUrl);
        setPickedUrl(null);
        setEditing(false);
    };

    const handleCropCancel = () => {
        if (pickedUrl) URL.revokeObjectURL(pickedUrl);
        setPickedUrl(null);
        setEditing(false);
    };

    const handleRecrop = () => {
        if (!coverFile) return;
        if (pickedUrl) URL.revokeObjectURL(pickedUrl);
        setPickedUrl(URL.createObjectURL(coverFile));
        setEditing(true);
    };

    const handleRemoveCover = () => {
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(null);
        setCoverFile(null);
    };

    const handlePublish = async () => {
        setPublishing(true);
        setError(null);
        try {
            await updateWorkDraft(draft.id, title.trim(), description.trim(), [], coverFile);
            const work = await publishWorkDraft(draft.id);
            toast.success("发布成功");
            onPublished(work);
        } catch (err) {
            setError(err instanceof Error ? err.message : "发布失败");
        } finally {
            setPublishing(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onOpenChange(false);
            }}
        >
            <DialogContent className="gap-4 rounded-xl p-5 outline-none sm:max-w-lg">
                <DialogHeader className="gap-1">
                    <DialogTitle className="font-heading text-base font-semibold">发布作品</DialogTitle>
                    <DialogDescription className="text-sm">作品代码使用草稿中的，发布后他人可见。</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="work-title">
                            标题 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="work-title"
                            value={title}
                            maxLength={MAX_TITLE}
                            placeholder="给你的作品起个标题"
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="work-desc">简介</Label>
                        <textarea
                            id="work-desc"
                            value={description}
                            maxLength={MAX_DESC}
                            rows={3}
                            placeholder="用一两句话介绍这个作品（可选）"
                            className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm dark:bg-input/30"
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>
                            封面 <span className="text-destructive">*</span>
                        </Label>
                        {editing && pickedUrl ? (
                            <CoverCropper
                                coverUrl={pickedUrl}
                                onConfirm={handleCropConfirm}
                                onCancel={handleCropCancel}
                            />
                        ) : (
                            <>
                                {currentCover ? (
                                    <div className="relative grid gap-2">
                                        <img
                                            src={currentCover}
                                            alt="封面预览"
                                            className="max-h-48 w-full rounded-lg border object-cover"
                                        />
                                        {coverFile && (
                                            <Button
                                                variant="destructive"
                                                size="icon-xs"
                                                className="absolute -top-1.5 -right-1.5"
                                                aria-label="移除封面"
                                                onClick={handleRemoveCover}
                                            >
                                                <X />
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="grid h-28 w-full place-items-center rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                                    >
                                        <span className="flex items-center gap-2">
                                            <ImagePlus className="size-5" />
                                            选择封面
                                        </span>
                                    </button>
                                )}
                                {currentCover && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <ImagePlus />
                                            {coverFile ? "重新选择" : "选择封面"}
                                        </Button>
                                        {coverFile && (
                                            <Button variant="outline" size="sm" onClick={handleRecrop}>
                                                重新裁切
                                            </Button>
                                        )}
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    className="hidden"
                                    onChange={handlePickCover}
                                />
                            </>
                        )}
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" disabled={publishing || editing} onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button disabled={publishing || editing || !canPublish} onClick={() => void handlePublish()}>
                        {publishing ? <Loader2 className="animate-spin" /> : <Send />}
                        {publishing ? "发布中…" : "发布"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
