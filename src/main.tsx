import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import router from "@/router";
import AuthBootstrap from "@/components/AuthBootstrap.tsx";
import { ThemeProvider } from "@/components/layout/ThemeProvider.tsx";
import { Toaster } from "@/components/ui/sonner.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthBootstrap>
            <ThemeProvider defaultTheme={"system"} storageKey={"app-theme"}>
                <Toaster position={"top-center"} />
                <RouterProvider router={router} />
            </ThemeProvider>
        </AuthBootstrap>
    </StrictMode>,
);
