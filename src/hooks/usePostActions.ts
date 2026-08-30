import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { setPostPinned, tipPost, toggleFavorite, toggleLike, unFavorite, unLike, type Post } from "@/lib/api";
import { useCoinsStore } from "@/stores/useCoins.ts";
import { useUserStore } from "@/stores/useUser.ts";

/**
 * 帖子交互动作的统一封装：点赞、收藏、投币、置顶。
 * 通过外部传入的 setPost 把结果合并回父组件的 Post 状态，本 Hook 不持有一份 Post 副本。
 *
 * 注意点：
 * - like/favorite/tip 共用同一个 reactBusy 标志，任意一个进行中会同时锁住其余两个按钮。
 * - 切换类操作根据当前状态选择 DELETE（取消）或 POST（开启）同 URL 的镜像接口。
 * - handleTip 直接调用 useCoinsStore.getState().setBalance(...) 同步全局余额（非订阅式写入）。
 */
export function usePostActions({
    post,
    setPost,
}: {
    post: Post | null;
    setPost: (updater: (prev: Post) => Post) => void;
}) {
    const me = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const [reactBusy, setReactBusy] = useState(false);
    const [pinBusy, setPinBusy] = useState(false);

    // 副作用式守卫：未登录时跳转 /login 并返回 false，调用方据此中断操作
    const requireLogin = useCallback((): boolean => {
        if (!me) {
            navigate("/login");
            return false;
        }
        return true;
    }, [me, navigate]);

    const handleLike = useCallback(async () => {
        if (!post) return;
        if (!requireLogin()) return;
        setReactBusy(true);
        try {
            // 已点赞则走 DELETE 取消，否则 POST 开启（收藏/投币行为同此模式）
            const res = post.is_liked ? await unLike(post.id) : await toggleLike(post.id);
            setPost((prev) => ({ ...prev, is_liked: res.liked, likes_count: res.likes_count }));
        } catch (err) {
            console.error(err);
        } finally {
            setReactBusy(false);
        }
    }, [post, requireLogin, setPost]);

    const handleFavorite = useCallback(async () => {
        if (!post) return;
        if (!requireLogin()) return;
        setReactBusy(true);
        try {
            const res = post.is_favorited ? await unFavorite(post.id) : await toggleFavorite(post.id);
            setPost((prev) => ({ ...prev, is_favorited: res.favorited, favorites_count: res.favorites_count }));
        } catch (err) {
            console.error(err);
        } finally {
            setReactBusy(false);
        }
    }, [post, requireLogin, setPost]);

    const handleTip = useCallback(async () => {
        if (!post) return;
        if (!requireLogin()) return;
        setReactBusy(true);
        try {
            const res = await tipPost(post.id);
            setPost((prev) => ({ ...prev, coins_count: res.coins_count }));
            // 投币余额变化直接写入全局 store，侧边栏余额随之更新
            useCoinsStore.getState().setBalance(res.balance);
            toast.success(`投币成功，当前余额 ${res.balance}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "投币失败");
        } finally {
            setReactBusy(false);
        }
    }, [post, requireLogin, setPost]);

    const handlePin = useCallback(
        async (onPinChanged?: () => void) => {
            if (!post) return;
            if (!requireLogin()) return;
            setPinBusy(true);
            try {
                const updated = await setPostPinned(post.id, !post.pinned);
                setPost(() => updated);
                onPinChanged?.();
            } catch (err) {
                console.error(err);
            } finally {
                setPinBusy(false);
            }
        },
        [post, requireLogin, setPost],
    );

    return { reactBusy, pinBusy, handleLike, handleFavorite, handleTip, handlePin };
}