import { useChatStore } from "@/stores/useChat";
import { ConversationItem } from "./ConversationItem";

export function ConversationList() {
    const conversations = useChatStore((s) => s.conversations);

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">暂无对话</p>
                <p className="text-xs mt-1">在用户主页点击"私聊"发起对话</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0.5 p-2">
            {conversations.map((conv) => (
                <ConversationItem
                    key={conv.peer_id}
                    peerId={conv.peer_id}
                    peerName={conv.peer_name}
                    peerAvatar={conv.peer_avatar}
                    lastPlaintext={conv.last_plaintext}
                    lastTime={conv.last_time}
                    unreadCount={conv.unread_count}
                />
            ))}
        </div>
    );
}
