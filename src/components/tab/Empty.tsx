import { cn } from "@/lib/utils.ts";

export default function Empty({ text, className }: { text: string; className?: string }) {
    return <div className={cn("py-8 text-center text-sm text-muted-foreground", className)}>{text}</div>;
}
