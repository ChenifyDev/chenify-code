import { useEffect, useMemo, useRef, useState } from "react";
import { ListTree } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { buildAstTree, type AstTreeNode } from "@/lib/ast-tree.ts";
import { cn } from "@/lib/utils.ts";

function AstTreeList({ content }: { content: string }) {
    const nodes = useMemo(() => buildAstTree(content), [content]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // 滚动定位（scroll-spy）：rootMargin 下缘收窄到视口底部 15%，
    // 让"进入该区域的标题"成为当前高亮项，跟着阅读进度走。
    useEffect(() => {
        if (nodes.length === 0) return;
        observerRef.current?.disconnect();
        observerRef.current = new IntersectionObserver(
            (entries) => {
                const intersecting = entries.filter((entry) => entry.isIntersecting);
                if (intersecting.length === 0) return;
                const topmost = intersecting.reduce((best, entry) =>
                    (entry.target as HTMLElement).getBoundingClientRect().top <
                    (best.target as HTMLElement).getBoundingClientRect().top
                        ? entry
                        : best,
                );
                setActiveId((topmost.target as HTMLElement).id);
            },
            { rootMargin: "0px 0px -85% 0px", threshold: 0 },
        );
        for (const node of nodes) {
            const el = document.getElementById(node.id);
            if (el) observerRef.current.observe(el);
        }
        return () => observerRef.current?.disconnect();
    }, [nodes]);

    const handleClick = (id: string) => {
        setActiveId(id);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="grid gap-0.5">
            {nodes.map((node: AstTreeNode) => (
                <button
                    key={node.id}
                    type="button"
                    onClick={() => handleClick(node.id)}
                    style={{ paddingLeft: `${(node.depth - 1) * 12 + 8}px` }}
                    className={cn(
                        "truncate rounded-md px-2 py-1 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        activeId === node.id && "bg-muted text-foreground",
                    )}
                >
                    {node.text}
                </button>
            ))}
        </div>
    );
}

export function PostAstTree({ content }: { content: string }) {
    const nodes = useMemo(() => buildAstTree(content), [content]);
    const [open, setOpen] = useState(false);

    if (nodes.length === 0) return null;

    return (
        <>
            <Button
                variant="outline"
                size="icon-lg"
                className="fixed right-4 bottom-6 z-30 shadow-md"
                aria-label="打开目录"
                onClick={() => setOpen(true)}
            >
                <ListTree />
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <ListTree className="size-4" />
                            目录
                        </SheetTitle>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                        <AstTreeList content={content} />
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}

export default PostAstTree;
