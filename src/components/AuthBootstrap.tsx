import { useEffect, type ReactNode } from "react";
import { clearToken, getToken, me } from "@/lib/api";
import { useUserStore } from "@/stores/useUser.ts";
import { useCoinsStore } from "@/stores/useCoins.ts";

export default function AuthBootstrap({ children }: { children: ReactNode }) {
    const setUser = useUserStore((s) => s.setUser);
    const setChecking = useUserStore((s) => s.setChecking);
    const fetchBalance = useCoinsStore((s) => s.fetchBalance);

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
                void fetchBalance();
            })
            .catch(() => {
                clearToken();
            })
            .finally(() => setChecking(false));
    }, [setChecking, setUser, fetchBalance]);

    return children;
}
