import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * 把草稿里保存的图片 URL 重新拉取为本地 File（跨域 CORS），
 * 供写帖页把已有草稿图片回填进编辑器以便再次提交；失败时返回 undefined。
 * 文件名用 uuid 占位，上传时服务端会重新取名。
 */
export async function urlToFile(imageUrl: string) {
    const res = await fetch(imageUrl, { mode: "cors" });
    if (!res.ok) return;
    const blob = await res.blob();
    return new File([blob], uuidv4(), { type: blob.type });
}
