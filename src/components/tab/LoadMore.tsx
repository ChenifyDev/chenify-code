import { Button } from "@/components/ui/button.tsx";
import { Loader2 } from "lucide-react";
import type { TabData } from "@/types/tab.ts";

export default function LoadMore<T>({ tab }: { tab: TabData<T> }) {
    if (!tab.hasMore) return null;
    return (
        <Button variant="outline" className="w-full" disabled={tab.loadingMore} onClick={() => void tab.load()}>
            {tab.loadingMore && <Loader2 className="animate-spin" />}
            {tab.loadingMore ? "加载中…" : "加载更多"}
        </Button>
    );
}
