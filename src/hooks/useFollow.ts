import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { toggleFollow, unFollow } from "@/lib/api";
import { useUserStore } from "@/stores/useUser.ts";

type FollowResult = { following: boolean; followers_count: number };

export function useFollow({
    userId,
    isFollowing,
    useUnfollow = false,
    enabled = true,
    onToggle,
}: {
    userId: number;
    isFollowing: boolean;
    useUnfollow?: boolean;
    enabled?: boolean;
    onToggle: (result: FollowResult) => void;
}) {
    const me = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);

    const toggle = useCallback(async () => {
        if (!enabled) return;
        if (!me) {
            navigate("/login");
            return;
        }
        setBusy(true);
        try {
            const res = isFollowing && useUnfollow ? await unFollow(userId) : await toggleFollow(userId);
            onToggle(res);
        } catch (err) {
            console.error(err);
        } finally {
            setBusy(false);
        }
    }, [enabled, me, navigate, isFollowing, useUnfollow, userId, onToggle]);

    return { busy, toggle };
}