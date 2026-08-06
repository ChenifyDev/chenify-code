import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import AppSidebar from "@/components/Sidebar.tsx";

export default function Layout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className={"w-full"}>
                <Outlet />
            </main>
        </SidebarProvider>
    );
}
