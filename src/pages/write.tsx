import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, Save, Send, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { createDraft, updateDraft, publishDraft, type Draft, getDraft } from "@/lib/api.ts";
import { cn, urlToFile } from "@/lib/utils.ts";
import { useUserStore } from "@/stores/useUser.ts";
import EditorField from "@/components/forum/MarkdownEditor.tsx";

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

    const [content, setContent] = useState(localStorage.getItem("tmp_content") || "");
    const [tagInput, setTagInput] = useState(localStorage.getItem("tmp_tag") || "");
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [status, setStatus] = useState<Draft["status"]>("draft");
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveDraftRef = useRef<() => Promise<void>>(async () => {});

    // 加载已有草稿
    useEffect(() => {
        let ignore = false;
        const func = async () => {
            if (!currentId) return;
            const data = await getDraft(Number(currentId));
            setContent(data.content);
            setTagInput(data.tags.join(" "));
            setStatus(data.status);
            const imageUrls = data.images;
            const imgs: File[] = [];
            for (const url of imageUrls) {
                const file = await urlToFile(url);
                if (!file) continue;
                imgs.push(file);
            }
            setImageFiles(imgs);
            setDirty(false); // 加载完毕，标记无未保存修改
        };
        if (!ignore) func().then();
        return () => {
            ignore = true;
        };
    }, [currentId]);

    // 防抖自动保存到 localStorage
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem("tmp_content", content);
            localStorage.setItem("tmp_tag", tagInput);
        }, 800);
        return () => clearTimeout(timer);
    }, [content, tagInput]);

    // 浏览器刷新/关闭标签页警告
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!dirty) return;
            e.preventDefault();
        };
        window.addEventListener("beforeunload", handler);
        return () => {
            window.removeEventListener("beforeunload", handler);
        };
    }, [dirty]);

    const tags = splitTags(tagInput);

    const handleSaveDraft = useCallback(async () => {
        setSaving(true);
        setMessage(null);
        setError(null);
        try {
            const draft: Draft = currentId
                ? await updateDraft(Number(currentId), content, imageFiles, tags)
                : await createDraft(content, imageFiles, tags);
            setStatus(draft.status);
            setDirty(false);
            setMessage(draft.status === "published" ? "帖子已更新" : `草稿已保存（#${draft.id}）`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "保存草稿失败");
        } finally {
            setSaving(false);
        }
    }, [tags, content, imageFiles, currentId]);

    useEffect(() => {
        saveDraftRef.current = handleSaveDraft;
    }, [handleSaveDraft]);

    if (!me) {
        navigate("/login");
        return null;
    }

    const handleContentChange = (v: string) => {
        setContent(v);
        setDirty(true);
    };

    const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTagInput(e.target.value);
        setDirty(true);
    };

    const handlePickImages = (files: FileList | null) => {
        if (!files) return;
        const next = [...imageFiles, ...Array.from(files)].slice(0, MAX_IMAGES);
        setImageFiles(next);
        setDirty(true);
    };

    const removeImage = (index: number) => {
        setImageFiles((prev) => prev.filter((_, i) => i !== index));
        setDirty(true);
    };

    const handlePublish = async () => {
        if (!content.trim()) return;
        setPublishing(true);
        setMessage(null);
        setError(null);
        try {
            if (currentId) {
                const draft = await updateDraft(Number(currentId), content, imageFiles, tags);
                setStatus(draft.status);
                setDirty(false);
                if (draft.status === "published" && draft.post_id != null) {
                    navigate(`/posts/${draft.post_id}`);
                    return;
                }
                const post = await publishDraft(Number(currentId));
                navigate(`/posts/${post.id}`);
            } else {
                const draft = await createDraft(content, imageFiles, tags);
                const post = await publishDraft(draft.id);
                setDirty(false);
                navigate(`/posts/${post.id}`);
            }
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
                            <h1 className="text-base font-semibold">写帖子</h1>
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
                                {publishing ? "保存中…" : status === "published" ? "保存并更新" : "发布"}
                            </Button>
                        </div>
                    </div>

                    {message && <p className="text-sm text-primary">{message}</p>}
                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <EditorField value={content} onChange={handleContentChange} />

                    <div className="grid gap-3 border-t pt-4">
                        <div className="grid gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">标签（用逗号或空格分隔）</span>
                            <Input value={tagInput} onChange={handleTagInputChange} />
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
