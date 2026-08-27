import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

type MessageBubbleProps = {
    message: ChatMessage;
    isCurrentUser: boolean;
    peerAvatar?: string;
    peerName?: string;
};

function formatTime(ts: number | string): string {
    const d = new Date(ts);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isCurrentUser, peerAvatar, peerName }: MessageBubbleProps) {
    return (
        <div className={cn("flex mb-4", isCurrentUser ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[70%] flex items-start gap-3", isCurrentUser && "flex-row-reverse")}>
                <Avatar className="size-8 shrink-0">
                    {isCurrentUser ? null : peerAvatar ? <AvatarImage src={peerAvatar} alt={peerName} /> : null}
                    <AvatarFallback>
                        {isCurrentUser ? "我" : peerName?.[0] ?? "?"}
                    </AvatarFallback>
                </Avatar>
                <div className={cn("flex flex-col", isCurrentUser ? "items-end" : "items-start")}>
                    <div className={cn("flex gap-1 min-w-12 mb-1", isCurrentUser ? "items-end" : "items-start")}>
                        <span className="text-xs text-muted-foreground">
                            {isCurrentUser ? "我" : peerName ?? `用户`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {formatTime(message.env.ts)}
                        </span>
                    </div>
                    <div
                        className={cn(
                            "rounded-2xl shadow-sm px-4 py-2",
                            isCurrentUser
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-muted border border-border text-foreground rounded-bl-none",
                        )}
                    >
                        <p className="text-sm wrap-break-word whitespace-pre-wrap">
                            {message.plaintext ?? "【解密失败】"}
                        </p>
                    </div>
                    {isCurrentUser && message.read_at && (
                        <span className="text-[10px] text-muted-foreground mt-0.5">已读</span>
                    )}
                </div>
            </div>
        </div>
    );
}
