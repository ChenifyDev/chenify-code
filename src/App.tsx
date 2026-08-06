import { Home as HomePage } from "@/pages/home.tsx";
import { useEffect } from "react";
import { clearToken, getToken, me } from "@/lib/api.ts";
import { Loader2 } from "lucide-react";
import { useUserStore } from "@/stores/useUser.ts";
import { useNavigate } from "react-router-dom";

function App() {
    const { user, setUser, checking, setChecking } = useUserStore();
    const navigate = useNavigate();

    useEffect(() => {
        const token = getToken();
        if (!token) {
            setChecking(false);
            return;
        }
        me()
            .then(setUser)
            .catch(() => {
                clearToken();
            })
            .finally(() => setChecking(false));
    }, [setChecking, setUser]);

    if (checking) {
        return (
            <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (!user) {
        navigate("/login");
        return null;
    }

    return (
        <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
            <HomePage
                user={user}
                onLogout={() => {
                    clearToken();
                    setUser(null);
                }}
            />
        </div>
    );
}

export default App;
