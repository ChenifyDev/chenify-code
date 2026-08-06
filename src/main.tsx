import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import router from "@/router";
import AuthBootstrap from "@/components/AuthBootstrap.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthBootstrap>
            <RouterProvider router={router} />
        </AuthBootstrap>
    </StrictMode>,
);
