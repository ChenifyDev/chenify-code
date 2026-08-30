import { useCallback, useState } from "react";

/** 复制链接到剪贴板，并在 1.5s 后自动清除"已复制"提示状态。 */
export function useCopyLink() {
    const [copied, setCopied] = useState(false);

    const copy = useCallback(async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // 忽略剪贴板不可用等错误
        }
    }, []);

    return { copied, copy };
}