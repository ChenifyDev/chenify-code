import { formatRelativeTime } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatStore } from "@/stores/useChat";
import { cn } from "@/lib/utils";

export function ConversationItem({ peerId, peerName, peerAvatar, lastPlaintext, lastTime, unreadCount }: {
    peerId: number;
    peerName?: string;
    peerAvatar?: string;
    lastPlaintext?: string;
    lastTime: string;
    unreadCount: number;
}) {
    const activePeerId = useChatStore((s) => s.activePeerId);
    const openConversation = useChatStore((s) => s.openConversation);
    const isActive = activePeerId === peerId;

    return (
        <button
            onClick={() => openConversation(peerId)}
            className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent",
                isActive && "bg-accent",
            )}
        >
            <Avatar className="size-10 shrink-0">
                {peerAvatar ? <AvatarImage src={peerAvatar} alt={peerName} /> : null}
                <AvatarFallback>{peerName?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{peerName ?? `用户 ${peerId}`}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {lastTime ? formatRelativeTime(lastTime) : ""}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="truncate text-xs text-muted-foreground">
                        {lastPlaintext ?? "暂无消息"}
                    </span>
                    {unreadCount > 0 && (
                        <span className="ml-2 shrink-0 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}
