import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/useChat";
import { MessageBubble } from "./MessageBubble";
import { ChatHeader } from "./ChatHeader";
import { MessageInput } from "./MessageInput";
import { Skeleton } from "@/components/ui/skeleton";

export function ChatView() {
    const activePeerId = useChatStore((s) => s.activePeerId);
    const messages = useChatStore((s) => s.messages);
    const myUserId = useChatStore((s) => s.myUserId);
    const loadingHistory = useChatStore((s) => s.loadingHistory);
    const hasMoreHistory = useChatStore((s) => s.hasMoreHistory);
    const loadHistory = useChatStore((s) => s.loadHistory);
    const conversations = useChatStore((s) => s.conversations);
    const peerKeysError = useChatStore((s) => s.peerKeysError);
    const endRef = useRef<HTMLDivElement>(null);

    const activeMessages = activePeerId !== null ? (messages.get(activePeerId) ?? []) : [];
    const conv = conversations.find((c) => c.peer_id === activePeerId);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeMessages.length]);

    if (!activePeerId) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                <p className="text-lg font-medium">选择一个对话</p>
                <p className="text-sm mt-1">从左侧列表选择，或在用户主页点击"私聊"</p>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col min-h-0">
            <ChatHeader />

            <div className="flex-1 overflow-y-auto px-4 py-2">
                {peerKeysError && (
                    <div className="my-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                        {peerKeysError}
                    </div>
                )}

                {hasMoreHistory && (
                    <button
                        onClick={() => loadHistory(false)}
                        className="mx-auto mb-4 block text-xs text-muted-foreground hover:text-foreground"
                    >
                        {loadingHistory ? "加载中..." : "加载更多历史消息"}
                    </button>
                )}

                {loadingHistory && activeMessages.length === 0 && (
                    <div className="space-y-4 py-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="size-8 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-10 w-48 rounded-2xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {[...activeMessages].reverse().map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        isCurrentUser={msg.sender_id === myUserId}
                        peerAvatar={conv?.peer_avatar}
                        peerName={conv?.peer_name}
                    />
                ))}
                <div ref={endRef} />
            </div>

            <MessageInput />
        </div>
    );
}
