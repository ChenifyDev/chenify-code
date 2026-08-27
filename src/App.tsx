import { useEffect } from "react";
import { Home as HomePage } from "@/pages/home.tsx";
import { Loader2 } from "lucide-react";
import { useUserStore } from "@/stores/useUser.ts";
import { useNavigate } from "react-router-dom";

function App() {
    const { user, checking } = useUserStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!checking && !user) {
            navigate("/login");
        }
    }, [user, checking, navigate]);

    if (checking) {
        return (
            <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (!user) return null;

    return (
        <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
            <HomePage />
        </div>
    );
}

export default App;
