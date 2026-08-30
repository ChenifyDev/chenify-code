import { type ChangeEventHandler, useState } from "react";

/**
 * 头像文件选择的统一封装：类型/大小校验 + 本地预览。
 *
 * 注意：为每次选择创建的 URL.createObjectURL 没有调用 revokeObjectURL() 释放，
 * 在选择/卸载较为频繁时会积累内存占用。
 */
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024;

export function useAvatarUpload({ onError }: { onError?: (message: string) => void } = {}) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
        const selected = event.target.files?.[0] ?? null;
        if (!selected) return;
        if (!ALLOWED_TYPES.includes(selected.type)) {
            onError?.("头像仅支持 png、jpg、webp、gif 格式");
            return;
        }
        if (selected.size > MAX_SIZE) {
            onError?.("头像大小不能超过 2MB");
            return;
        }
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
    };

    const handleRemove = () => {
        setFile(null);
        setPreview(null);
    };

    return { file, preview, handleChange, handleRemove };
}