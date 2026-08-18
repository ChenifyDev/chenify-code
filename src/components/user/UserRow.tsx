import { useUserStore } from "@/stores/useUser.ts";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { type FollowUser, toggleFollow } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { UserCheck, UserPlus } from "lucide-react";

export default function UserRow({
    user,
    onFollowChange,
}: {
    user: FollowUser;
    onFollowChange: (updated: FollowUser) => void;
}) {
    const me = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const isSelf = me?.id === user.id;

    const handleFollow = async () => {
        if (!me) {
            navigate("/login");
            return;
        }
        setBusy(true);
        try {
            const res = await toggleFollow(user.id);
            onFollowChange({ ...user, is_following: res.following });
        } catch (err) {
            console.error(err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
            <Link to={`/users/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar>
                    {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
                    <AvatarFallback>{user.username.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-medium">{user.username}</span>
            </Link>
            {!isSelf && (
                <Button
                    size="sm"
                    variant={user.is_following ? "outline" : "default"}
                    disabled={busy}
                    onClick={handleFollow}
                >
                    {user.is_following ? <UserCheck /> : <UserPlus />}
                    {user.is_following ? "已关注" : "关注"}
                </Button>
            )}
        </div>
    );
}
