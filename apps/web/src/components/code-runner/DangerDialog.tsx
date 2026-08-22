import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DangerItem } from "@/lib/coding-helper/protocol";

interface DangerDialogProps {
    open: boolean;
    items: DangerItem[];
    timeoutSecs: number;
    onAllow: () => void;
    onDeny: () => void;
}

export function DangerDialog({ open, items, timeoutSecs, onAllow, onDeny }: DangerDialogProps) {
    const [remaining, setRemaining] = useState(timeoutSecs);

    useEffect(() => {
        if (!open) return;
        setRemaining(timeoutSecs);
        if (timeoutSecs <= 0) return;

        const timer = setInterval(() => {
            setRemaining((r) => {
                if (r <= 1) {
                    clearInterval(timer);
                    onDeny();
                    return 0;
                }
                return r - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [open, timeoutSecs, onDeny]);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onDeny();
            }}
        >
            <DialogContent className="w-[min(92vw,520px)] gap-4 rounded-xl p-5 outline-none" showCloseButton={false}>
                <DialogHeader className="gap-1">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex size-2 shrink-0 rounded-full bg-destructive" />
                        <DialogTitle className="font-heading text-base font-semibold">检测到危险代码</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm">
                        代码中包含 {items.length} 项危险操作，需要确认后才会继续执行。
                        {timeoutSecs > 0 && (
                            <span className="ml-1 font-medium text-destructive">{remaining}s 后自动取消</span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium">{item.label}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">第 {item.line} 行</span>
                            </div>
                            {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
                            <pre
                                className={cn(
                                    "max-h-24 overflow-x-auto overflow-y-hidden whitespace-pre rounded bg-[#0b0d10] p-2 font-mono text-xs text-emerald-300",
                                )}
                            >
                                {item.code}
                            </pre>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onDeny}>
                        取消运行
                    </Button>
                    <Button variant="destructive" onClick={onAllow}>
                        允许执行
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
