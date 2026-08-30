import { useCallback, useState } from "react";

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