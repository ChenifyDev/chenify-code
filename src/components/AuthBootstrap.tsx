import { useEffect, type ReactNode } from "react";
import { clearToken, getToken, me } from "@/lib/api.ts";
import { useUserStore } from "@/stores/useUser.ts";

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
            .then(setUser)
            .catch(() => {
                clearToken();
            })
            .finally(() => setChecking(false));
    }, [setChecking, setUser]);

    return children;
}