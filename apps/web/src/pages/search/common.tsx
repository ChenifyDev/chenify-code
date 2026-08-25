import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

export function SkeletonList({ className }: { className?: string }) {
    return (
        <div className={cn("grid gap-3", className)}>
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} size="sm">
                    <CardContent className="grid gap-3">
                        <div className="flex items-center gap-2">
                            <Skeleton className="size-6 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function Empty({ text, className }: { text: string; className?: string }) {
    return <div className={cn("py-10 text-center text-sm text-muted-foreground", className)}>{text}</div>;
}

export function LoadMore({ loading, onClick }: { loading: boolean; onClick: () => void }) {
    return (
        <Button variant="outline" className="w-full" disabled={loading} onClick={onClick}>
            {loading && <Loader2 className="animate-spin" />}
            {loading ? "加载中…" : "加载更多"}
        </Button>
    );
}
