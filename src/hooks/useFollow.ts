import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { toggleFollow, unFollow } from "@/lib/api";
import { useUserStore } from "@/stores/useUser.ts";

/**
 * 关注/取关的统一封装，供帖子作者区、个人空间头部、各排行榜/搜索用户行复用。
 *
 * 关键约定：
 * - useUnfollow=true 且当前已关注时，走 DELETE unFollow；否则一律调用 toggleFollow
 *   （toggleFollow 在部分服务端实现里本身就能取关）。useFollow 默认 useUnfollow=false
 *   以保持"总是 POST toggleFollow"的旧行为。
 * - 无乐观更新：父组件持有列表/用户状态，通过 onToggle 回传最新结果由其合并。
 * - enabled 可在数据就绪前（如帖子尚未加载）暂时禁用关注。
 */
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