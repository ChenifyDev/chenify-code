import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUser";
import { useChatStore } from "@/stores/useChat";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatView } from "@/components/chat/ChatView";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
    const user = useUserStore((s) => s.user);
    const checking = useUserStore((s) => s.checking);
    const navigate = useNavigate();
    const { peerId } = useParams();
    const isMobile = useIsMobile();

    const initKeys = useChatStore((s) => s.initKeys);
    const connect = useChatStore((s) => s.connect);
    const openConversation = useChatStore((s) => s.openConversation);
    const activePeerId = useChatStore((s) => s.activePeerId);
    const connected = useChatStore((s) => s.connected);

    useEffect(() => {
        if (checking) return;
        if (!user) {
            navigate("/login");
            return;
        }
        initKeys(user.id).then(() => connect());
    }, [user, checking]);

    useEffect(() => {
        if (peerId && connected) {
            openConversation(Number(peerId));
        }
    }, [peerId, connected]);

    if (checking || !user) return null;

    const showList = !isMobile || !activePeerId;
    const showChat = !isMobile || activePeerId;

    return (
        <div className="flex h-full">
            {showList && (
                <div className="w-full shrink-0 border-r md:w-80 lg:w-96">
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                        <MessageSquare className="size-5" />
                        <h2 className="text-sm font-semibold">私聊</h2>
                    </div>
                    <ConversationList />
                </div>
            )}
            {showChat && (
                <div className="flex min-w-0 flex-1">
                    <ChatView />
                </div>
            )}
        </div>
    );
}
