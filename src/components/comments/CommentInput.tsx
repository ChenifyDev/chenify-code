import { Link, useNavigate } from "react-router-dom";
import { CornerDownRight, Loader2, Send } from "lucide-react";
import { UserAvatar } from "@/components/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { UserPublic, UserSummary } from "@/lib/api";

type BaseComment<T> = {
    id: number;
    parent_id: number | null;
    replies: T[];
    author: UserSummary;
};

export default function CommentInput<T extends BaseComment<T>>({
    me,
    sending,
    draft,
    replyTo,
    setDraft,
    setReplyTo,
    handleSend,
}: {
    me: UserPublic | null;
    sending: boolean;
    draft: string;
    replyTo: T | null;
    setDraft: (draft: string) => void;
    setReplyTo: (value: T | null) => void;
    handleSend: () => Promise<void>;
}) {
    const navigate = useNavigate();
    return (
        <>
            {me ? (
                <div className="grid gap-2">
                    {replyTo && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CornerDownRight className="size-3.5" />
                            正在回复
                            <Link
                                to={`/users/${replyTo.author.id}`}
                                className="truncate font-medium hover:text-foreground"
                            >
                                @{replyTo.author.username}
                            </Link>
                            <button
                                type="button"
                                className="ml-auto hover:text-foreground"
                                onClick={() => setReplyTo(null)}
                                aria-label="取消回复"
                            >
                                取消
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <UserAvatar user={me} size="sm" className="mt-1 shrink-0" />
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSend();
                                }
                            }}
                            placeholder={replyTo ? `回复 @${replyTo.author.username}…` : "写下你的评论…"}
                            rows={2}
                            className="min-h-16 w-full flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                        />
                        <Button
                            variant="default"
                            size="sm"
                            className="mt-1 shrink-0"
                            disabled={sending || !draft.trim()}
                            onClick={handleSend}
                        >
                            {sending ? <Loader2 className="animate-spin" /> : <Send />}
                            发送
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    <button className="text-primary underline underline-offset-2" onClick={() => navigate("/login")}>
                        登录
                    </button>
                    &nbsp;后参与评论
                </p>
            )}
        </>
    );
}
