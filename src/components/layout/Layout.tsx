import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import AppSidebar from "@/components/layout/Sidebar.tsx";
import { TooltipProvider } from "../ui/tooltip";

export default function Layout() {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <main className={"w-full"}>
                    <Outlet />
                </main>
            </SidebarProvider>
        </TooltipProvider>
    );
}
