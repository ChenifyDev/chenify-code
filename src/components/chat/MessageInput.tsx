import { useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/useChat";

export function MessageInput() {
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const sendMessage = useChatStore((s) => s.sendMessage);
    const connected = useChatStore((s) => s.connected);
    const activePeerId = useChatStore((s) => s.activePeerId);
    const peerKeysError = useChatStore((s) => s.peerKeysError);
    const disabled = !connected || !activePeerId || !!peerKeysError;

    const placeholder = peerKeysError
        ? peerKeysError
        : connected
            ? "输入消息..."
            : "连接中...";

    const handleSend = useCallback(async () => {
        const trimmed = text.trim();
        if (!trimmed || sending || disabled) return;
        setSending(true);
        try {
            await sendMessage(trimmed);
            setText("");
        } catch {
            // error handled in store
        } finally {
            setSending(false);
        }
    }, [text, sending, disabled, sendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex items-center gap-2 border-t px-4 py-3">
            <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1"
            />
            <Button
                size="icon"
                onClick={handleSend}
                disabled={!text.trim() || sending || disabled}
            >
                <Send className="size-4" />
            </Button>
        </div>
    );
}
