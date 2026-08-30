import { useEffect, useState } from "react";
import {
    Bell,
    CalendarCheck,
    Code2,
    Coins,
    Ellipsis,
    FileText,
    Home,
    LogOut,
    Podium,
    Settings,
    Signpost,
    SquarePen,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { clearToken, getCheckinStatus, getUnreadNotifications } from "@/lib/api";
import { useUserStore } from "@/stores/useUser.ts";
import { useCoinsStore } from "@/stores/useCoins.ts";
import { UserAvatar } from "@/components/avatar.tsx";
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
    SidebarRail,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";
import { ModeToggle } from "@/components/layout/ModeToggle.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

export default function AppSidebar() {
    const user = useUserStore((s) => s.user);
    const setUser = useUserStore((s) => s.setUser);
    const balance = useCoinsStore((s) => s.balance);
    const checkedToday = useCoinsStore((s) => s.checkedToday);
    const setCheckedToday = useCoinsStore((s) => s.setCheckedToday);
    const navigate = useNavigate();
    const location = useLocation();
    const [keyword, setKeyword] = useState("");
    const [unread, setUnread] = useState(0);
    const { state, toggleSidebar } = useSidebar();
    const isCollapsed = state === "collapsed";

    // 兜底轮询：未读消息数 + 今日签到状态，每隔 30s 刷新一次（进入消息页时再置零角标）
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        const refresh = async () => {
            try {
                const { count } = await getUnreadNotifications();
                if (!cancelled) setUnread(count);
            } catch {
                // 忽略轮询失败
            }
            try {
                const status = await getCheckinStatus();
                if (!cancelled) setCheckedToday(status.checked_today);
            } catch {
                // 忽略轮询失败
            }
        };
        void refresh();
        const timer = setInterval(refresh, 30_000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [user, setCheckedToday]);

    // 进入消息页后立即清掉角标，配合上方轮询下次再拉取真实未读数
    useEffect(() => {
        if (location.pathname === "/notifications") setUnread(0);
    }, [location.pathname]);

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
        <Sidebar collapsible={"icon"}>
            <SidebarHeader>
                <div className={cn("flex gap-3 justify-between", "group-data-[collapsible=icon]:justify-center")}>
                    <div className={cn("flex items-center gap-3 px-2 py-1", "group-data-[collapsible=icon]:gap-0")}>
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Code2
                                className={cn("size-5", isCollapsed && "cursor-pointer")}
                                onClick={isCollapsed ? () => toggleSidebar() : () => {}}
                            />
                        </div>
                        <div className={cn("grid gap-0.5 leading-tight", "group-data-[collapsible=icon]:hidden")}>
                            <p className="text-sm font-semibold">ChenifyHub</p>
                            <p className="text-xs text-muted-foreground">更好的帖子社区</p>
                        </div>
                    </div>
                    <div className={cn("flex gap-1.5 items-center", "group-data-[collapsible=icon]:hidden")}>
                        <SidebarTrigger className="h-9 w-9 rounded-lg transition-all duration-200 hover:bg-sidebar-accent active:scale-95" />
                        <ModeToggle />
                    </div>
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
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <NavLink to="/rank">
                            {({ isActive }) => (
                                <SidebarMenuButton isActive={isActive} tooltip="排行榜">
                                    <Podium />
                                    <span>排行榜</span>
                                </SidebarMenuButton>
                            )}
                        </NavLink>
                    </SidebarMenuItem>
                    {user && (
                        <SidebarMenuItem>
                            <NavLink to="/checkin">
                                {({ isActive }) => (
                                    <SidebarMenuButton isActive={isActive} tooltip="每日签到">
                                        <span className="relative inline-flex">
                                            <CalendarCheck />
                                            {checkedToday === false && (
                                                <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber-500 group-data-[collapsible=icon]:block hidden" />
                                            )}
                                        </span>
                                        <span>每日签到</span>
                                        {checkedToday === false && (
                                            <span className="ml-auto rounded-full bg-amber-500 px-1.5 text-[10px] font-medium text-white group-data-[collapsible=icon]:hidden">
                                                签到
                                            </span>
                                        )}
                                    </SidebarMenuButton>
                                )}
                            </NavLink>
                        </SidebarMenuItem>
                    )}
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
                                    <SidebarMenuButton isActive={isActive} tooltip="写帖子">
                                        <SquarePen />
                                        <span>写帖子</span>
                                    </SidebarMenuButton>
                                )}
                            </NavLink>
                        </SidebarMenuItem>
                    )}
                    {user && (
                        <SidebarMenuItem>
                            <NavLink to="/notifications">
                                {({ isActive }) => (
                                    <SidebarMenuButton isActive={isActive} tooltip="消息">
                                        <span className="relative inline-flex">
                                            <Bell />
                                            {unread > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                                                    {unread > 99 ? "99+" : unread}
                                                </span>
                                            )}
                                        </span>
                                        <span>消息</span>
                                        {unread > 0 && (
                                            <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground group-data-[collapsible=icon]:hidden">
                                                {unread > 99 ? "99+" : unread}
                                            </span>
                                        )}
                                    </SidebarMenuButton>
                                )}
                            </NavLink>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
                <div className="flex items-center gap-2 rounded-md px-2 py-1 group-data-[collapsible=icon]:justify-center">
                    <UserAvatar
                        user={user}
                        onClick={() => navigate(`/users/${user?.id}`)}
                        className={cn("shrink-0", user && "cursor-pointer")}
                        fallback={<Code2 />}
                    />
                    <div
                        className={cn(
                            "grid min-w-0 flex-1 gap-0 leading-tight",
                            "group-data-[collapsible=icon]:hidden",
                        )}
                    >
                        <p
                            className={cn("truncate text-sm font-medium", user && "cursor-pointer")}
                            onClick={() => user && navigate(`/users/${user?.id}`)}
                        >
                            {user?.username ?? "未登录"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email ?? "欢迎来到 ChenifyHub"}</p>
                        {user && balance != null && (
                            <p className="flex items-center gap-1 truncate text-xs text-amber-500">
                                <Coins className="size-3 shrink-0" />
                                {Math.round(balance * 100) / 100}
                            </p>
                        )}
                    </div>
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <SidebarMenuButton className="h-8 w-8 justify-center px-0 group-data-[collapsible=icon]:hidden">
                                        <Ellipsis />
                                    </SidebarMenuButton>
                                }
                            />
                            <DropdownMenuContent side="top" align="end">
                                <NavLink to={"/settings"}>
                                    <DropdownMenuItem>
                                        <Settings className="mr-2 h‑4 w‑4" />
                                        设置
                                    </DropdownMenuItem>
                                </NavLink>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                                    <LogOut className="mr-2 h‑4 w‑4" />
                                    退出登录
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <SidebarMenuButton
                            className="h-8 w-8 justify-center px-0 group-data-[collapsible=icon]:hidden"
                            onClick={() => navigate("/login")}
                        >
                            <LogOut className={"size-4"} />
                        </SidebarMenuButton>
                    )}
                </div>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
