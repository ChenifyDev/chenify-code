import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { setPostPinned, tipPost, toggleFavorite, toggleLike, unFavorite, unLike, type Post } from "@/lib/api";
import { useCoinsStore } from "@/stores/useCoins.ts";
import { useUserStore } from "@/stores/useUser.ts";

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