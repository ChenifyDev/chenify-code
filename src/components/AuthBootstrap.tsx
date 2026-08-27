import { useEffect, type ReactNode } from "react";
import { clearToken, getToken, me } from "@/lib/api.ts";
import { useUserStore } from "@/stores/useUser.ts";
import { getOrCreateKeys } from "@/lib/chat/storage";
import { registerKeys } from "@/lib/chat/api";
import { buildProofSig } from "@/lib/chat/crypto";

export default function AuthBootstrap({ children }: { children: ReactNode }) {
    const setUser = useUserStore((s) => s.setUser);
    const setChecking = useUserStore((s) => s.setChecking);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            setChecking(false);
            return;
        }
        setChecking(true);
        me()
            .then((user) => {
                setUser(user);
                const keys = getOrCreateKeys(user.id);
                registerKeys(keys.edPub, keys.xPub, buildProofSig(user.id, keys.xPub, keys.edPriv)).catch(() => {});
            })
            .catch(() => {
                clearToken();
            })
            .finally(() => setChecking(false));
    }, [setChecking, setUser]);

    return children;
}
