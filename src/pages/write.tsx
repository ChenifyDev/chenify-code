import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, Save, Send, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { createDraft, createPost, type Draft, getDraft } from "@/lib/api.ts";
import { cn, urlToFile } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser.ts";
import EditorField from "@/components/MarkdownEditor.tsx";

const MAX_IMAGES = 9;
const MAX_TAGS = 10;
const MAX_CONTENT_LENGTH = 20000;

function splitTags(raw: string): string[] {
    return [
        ...new Set(
            raw
                .split(/[,，\s]+/)
                .map((tag) => tag.trim().toLowerCase())
                .filter(Boolean),
        ),
    ].slice(0, MAX_TAGS);
}

export default function Write() {
    const me = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const [searchParams, _] = useSearchParams();
    const currentId = searchParams.get("id");

    useEffect(() => {
        let ignore = true;
        const func = async () => {
            if (currentId) {
                const data = await getDraft(Number(currentId));
                setContent(data.content);
                setTagInput(data.tags.join(" "));
                const imageUrls = data.images;
                const imageFiles: File[] = [];
                for (let url of imageUrls) {
                    const file = await urlToFile(url);
                    if (!file) continue;
                    imageFiles.push(file);
                }
                setImageFiles(imageFiles);
            }
        };
        if (ignore) func().then();
        return () => {
            ignore = false;
        };
    }, [currentId]);

    const [content, setContent] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!me) {
        navigate("/login");
        return null;
    }

    const tags = splitTags(tagInput);

    const handlePickImages = (files: FileList | null) => {
        if (!files) return;
        const next = [...imageFiles, ...Array.from(files)].slice(0, MAX_IMAGES);
        setImageFiles(next);
    };

    const removeImage = (index: number) => {
        setImageFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveDraft = async () => {
        setSaving(true);
        setMessage(null);
        setError(null);
        try {
            const draft: Draft = await createDraft(content, imageFiles, tags);
            setMessage(`草稿已保存（#${draft.id}）`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "保存草稿失败");
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!content.trim()) return;
        setPublishing(true);
        setMessage(null);
        setError(null);
        try {
            const post = await createPost(content, imageFiles, tags);
            navigate(`/posts/${post.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "发布失败");
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <Card>
                <CardContent className="grid gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon-sm" aria-label="返回" onClick={() => navigate(-1)}>
                            <ArrowLeft />
                        </Button>
                        <div className="grid min-w-0 flex-1 gap-0.5">
                            <h1 className="text-base font-semibold">写文章</h1>
                            <p className="text-xs text-muted-foreground">
                                {content.length > MAX_CONTENT_LENGTH
                                    ? `内容已超过 ${MAX_CONTENT_LENGTH} 字`
                                    : `支持富文本与 LaTeX 数学公式，写作后可保存草稿或直接发布`}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={saving || publishing}
                                onClick={() => void handleSaveDraft()}
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                                {saving ? "保存中…" : "保存草稿"}
                            </Button>
                            <Button
                                size="sm"
                                disabled={publishing || saving || !content.trim()}
                                onClick={() => void handlePublish()}
                            >
                                {publishing ? <Loader2 className="animate-spin" /> : <Send />}
                                {publishing ? "发布中…" : "发布"}
                            </Button>
                        </div>
                    </div>

                    {message && <p className="text-sm text-primary">{message}</p>}
                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <EditorField value={content} onChange={setContent} />

                    <div className="grid gap-3 border-t pt-4">
                        <div className="grid gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">标签（用逗号或空格分隔）</span>
                            <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                placeholder="例如 react, bun, 前端"
                            />
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">
                                图片（最多 {MAX_IMAGES} 张）
                            </span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    handlePickImages(e.target.files);
                                    e.target.value = "";
                                }}
                            />
                            {imageFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {imageFiles.map((file, i) => (
                                        <div key={i} className="relative">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`图片 ${i + 1}`}
                                                className={cn("size-20 rounded-md object-cover")}
                                            />
                                            <Button
                                                variant="destructive"
                                                size="icon-xs"
                                                className="absolute -top-1.5 -right-1.5"
                                                aria-label="移除图片"
                                                onClick={() => removeImage(i)}
                                            >
                                                <X />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={imageFiles.length >= MAX_IMAGES}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImagePlus />
                                    添加图片
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
