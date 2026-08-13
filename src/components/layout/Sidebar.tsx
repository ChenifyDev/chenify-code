import { useState } from "react";
import { Code2, FileText, Home, LogOut, LogIn, SquarePen, Signpost, Compass, Settings } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { clearToken } from "@/lib/api.ts";
import { useUserStore } from "@/stores/useUser.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import SearchBox from "@/components/search/SearchBox.tsx";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";
import { ModeToggle } from "@/components/layout/ModeToggle.tsx";

export default function AppSidebar() {
    const user = useUserStore((s) => s.user);
    const setUser = useUserStore((s) => s.setUser);
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState("");

    const handleLogout = () => {
        clearToken();
        setUser(null);
        navigate("/login");
    };

    const handleSearch = (keyword: string) => {
        setKeyword("");
        navigate(keyword ? `/search?q=${encodeURIComponent(keyword)}` : "/search");
    };

    return (
        <Sidebar>
            <SidebarHeader>
                <div className={"flex gap-3 justify-between"}>
                    <div className="flex items-center gap-3 px-2 py-1">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Code2 className="size-5" />
                        </div>
                        <div className="grid gap-0.5 leading-tight">
                            <p className="text-sm font-semibold">ChenifyCode</p>
                            <p className="text-xs text-muted-foreground">更好的编程社区</p>
                        </div>
                    </div>
                    <ModeToggle />
                </div>
                <SearchBox
                    value={keyword}
                    onValueChange={setKeyword}
                    onSubmit={handleSearch}
                    className="px-2 pb-1 group-data-[collapsible=icon]:hidden"
                />
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <NavLink to="/" end>
                                    {({ isActive }) => (
                                        <SidebarMenuButton isActive={isActive} tooltip="首页">
                                            <Home />
                                            <span>首页</span>
                                        </SidebarMenuButton>
                                    )}
                                </NavLink>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavLink to="/explore-posts">
                                    {({ isActive }) => (
                                        <SidebarMenuButton isActive={isActive} tooltip="帖子">
                                            <Signpost />
                                            <span>帖子</span>
                                        </SidebarMenuButton>
                                    )}
                                </NavLink>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavLink to="/explore-works">
                                    {({ isActive }) => (
                                        <SidebarMenuButton isActive={isActive} tooltip="帖子">
                                            <Compass />
                                            <span>作品</span>
                                        </SidebarMenuButton>
                                    )}
                                </NavLink>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    {user && (
                        <SidebarMenuItem>
                            <NavLink to="/drafts">
                                {({ isActive }) => (
                                    <SidebarMenuButton isActive={isActive} tooltip="草稿管理">
                                        <FileText />
                                        <span>草稿管理</span>
                                    </SidebarMenuButton>
                                )}
                            </NavLink>
                        </SidebarMenuItem>
                    )}
                    {user && (
                        <SidebarMenuItem>
                            <NavLink to="/write">
                                {({ isActive }) => (
                                    <SidebarMenuButton isActive={isActive} tooltip="写文章">
                                        <SquarePen />
                                        <span>写文章</span>
                                    </SidebarMenuButton>
                                )}
                            </NavLink>
                        </SidebarMenuItem>
                    )}
                    {user && (
                        <SidebarMenuItem>
                            <NavLink to="/settings">
                                {({ isActive }) => (
                                    <SidebarMenuButton isActive={isActive} tooltip="设置">
                                        <Settings />
                                        <span>设置</span>
                                    </SidebarMenuButton>
                                )}
                            </NavLink>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
                <div className="flex items-center gap-2 rounded-md px-2 py-1 group-data-[collapsible=icon]:justify-center">
                    <Avatar
                        onClick={() => navigate(`/users/${user?.id}`)}
                        className={cn("shrink-0", user && "cursor-pointer")}
                    >
                        {user?.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
                        <AvatarFallback>{user ? user.username.slice(0, 2) : <Code2 />}</AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 gap-0 leading-tight">
                        <p
                            className={cn("truncate text-sm font-medium", user && "cursor-pointer")}
                            onClick={() => user && navigate(`/users/${user?.id}`)}
                        >
                            {user?.username ?? "未登录"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {user?.email ?? "欢迎来到 ChenifyCode"}
                        </p>
                    </div>
                    <SidebarMenuButton
                        className="h-8 w-8 justify-center px-0 group-data-[collapsible=icon]:hidden"
                        onClick={handleLogout}
                    >
                        {user ? <LogOut /> : <LogIn />}
                    </SidebarMenuButton>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
