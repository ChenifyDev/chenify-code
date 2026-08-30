import { Button } from "@/components/ui/button.tsx";
import { Loader2 } from "lucide-react";
import type { TabData } from "@/types/tab.ts";

export default function LoadMore<T>({
    tab,
    hasMore,
    loading,
    onClick,
}: {
    tab?: TabData<T>;
    hasMore?: boolean;
    loading?: boolean;
    onClick?: () => void;
}) {
    const show = tab ? tab.hasMore : (hasMore ?? true);
    const busy = tab ? tab.loadingMore : (loading ?? false);
    const handle = tab ? () => void tab.load() : (onClick ?? (() => {}));
    if (!show) return null;
    return (
        <Button variant="outline" className="w-full" disabled={busy} onClick={handle}>
            {busy && <Loader2 className="animate-spin" />}
            {busy ? "加载中…" : "加载更多"}
        </Button>
    );
}