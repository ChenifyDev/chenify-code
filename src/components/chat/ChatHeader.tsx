import { useChatStore } from "@/stores/useChat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export function ChatHeader() {
    const activePeerId = useChatStore((s) => s.activePeerId);
    const conversations = useChatStore((s) => s.conversations);
    const onlineUsers = useChatStore((s) => s.onlineUsers);
    const connected = useChatStore((s) => s.connected);
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const conv = conversations.find((c) => c.peer_id === activePeerId);
    const isOnline = activePeerId !== null && onlineUsers.has(activePeerId);

    if (!activePeerId || !conv) return null;

    return (
        <div className="flex items-center gap-3 border-b px-4 py-3">
            {isMobile && (
                <button onClick={() => navigate("/chat")} className="mr-1 rounded-md p-1 hover:bg-accent">
                    <ArrowLeft className="size-5" />
                </button>
            )}
            <Avatar className="size-9">
                {conv.peer_avatar ? <AvatarImage src={conv.peer_avatar} alt={conv.peer_name} /> : null}
                <AvatarFallback>{conv.peer_name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{conv.peer_name ?? `用户 ${activePeerId}`}</p>
                <p className="text-xs text-muted-foreground">
                    {connected ? (isOnline ? "在线" : "离线") : "未连接"}
                </p>
            </div>
        </div>
    );
}
