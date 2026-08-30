import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { checkIn, getCheckinStatus } from "@/lib/api";
import { cn } from "@/lib/utils.ts";
import { useCoinsStore } from "@/stores/useCoins.ts";
import { useUserStore } from "@/stores/useUser.ts";

function formatLocalDate(value: string): string {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("zh-CN");
}

// 服务端日期是纯 "YYYY-MM-DD" 字符串，直接 new Date(...) 会按 UTC 解析导致时区偏移；
// 这里用本地时区拼键，保证 "今天" 的判断与本地日历一致。
function localTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function StatusSkeleton() {
    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <Card>
                <CardContent className="grid justify-items-center gap-4 py-10">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                    <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-10 w-56 animate-pulse rounded bg-muted" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function CheckinPage() {
    const me = useUserStore((s) => s.user);
    const checking = useUserStore((s) => s.checking);
    const balance = useCoinsStore((s) => s.balance);
    const storeCheckedToday = useCoinsStore((s) => s.checkedToday);
    const navigate = useNavigate();

    const checkedToday = storeCheckedToday ?? false;
    const [days, setDays] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // 加载的同时把余额与签到状态写入全局 store（侧边栏也会轮询刷新这两项）
    useEffect(() => {
        if (me == null) return;
        let cancelled = false;
        setLoading(true);
        getCheckinStatus()
            .then((res) => {
                if (cancelled) return;
                setDays(res.days);
                useCoinsStore.getState().setBalance(res.balance);
                useCoinsStore.getState().setCheckedToday(res.checked_today);
            })
            .catch(() => {
                if (!cancelled) toast.error("签到状态加载失败");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [me]);

    const handleCheckIn = useCallback(async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await checkIn();
            if (res.granted) {
                setDays((prev) => [localTodayKey(), ...prev]);
                useCoinsStore.getState().setBalance(res.balance);
                useCoinsStore.getState().setCheckedToday(true);
                toast.success("签到成功，获得 1 枚硬币");
            } else {
                // 已迟到不需要真的领币，但同样把"今日已签"同步进 store，禁用按钮
                useCoinsStore.getState().setCheckedToday(true);
                toast.info("今天已经签到过了");
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "签到失败");
        } finally {
            setSubmitting(false);
        }
    }, [submitting]);

    if (checking) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <Coins className="size-6 animate-pulse text-muted-foreground" />
            </div>
        );
    }
    if (!me) {
        navigate("/login");
        return null;
    }
    if (loading) return <StatusSkeleton />;

    // days 是完整时间键（YYYY-MM-DD...），截取前 10 位去重并最多展示最近 14 天
    const recent = Array.from(new Set(days.map((d) => d.slice(0, 10)))).slice(0, 14);
    const todayKey = localTodayKey();

    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <Card>
                <CardContent className="grid justify-items-center gap-4 py-10">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                        <CalendarCheck className="size-8" />
                    </div>
                    <div className="grid justify-items-center gap-1 text-center">
                        <p className="text-2xl font-bold">{days.length} 天</p>
                        <p className="text-sm text-muted-foreground">累计签到</p>
                    </div>
                    <Button
                        size="lg"
                        className="w-56"
                        disabled={checkedToday || submitting}
                        onClick={() => void handleCheckIn()}
                    >
                        <Coins />
                        {submitting ? "签到中…" : checkedToday ? "今日已签到" : "立即签到 +1"}
                    </Button>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Coins className="size-4 text-amber-500" />
                        当前余额：
                        <span className="font-semibold text-amber-500">{balance ?? "-"}</span>
                    </p>
                </CardContent>
            </Card>

            <Separator className="my-5" />

            <Card>
                <CardContent className="grid gap-1 pt-4">
                    {recent.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">还没有签到记录</p>
                    ) : (
                        recent.map((date) => (
                            <div
                                key={date}
                                className="flex items-center justify-between rounded-md px-2 py-2 text-sm"
                            >
                                <span className="text-muted-foreground">{formatLocalDate(date)}</span>
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 font-medium",
                                        date === todayKey && !checkedToday ? "text-muted-foreground" : "text-amber-500",
                                    )}
                                >
                                    <Coins className="size-3.5" />
                                    已签到
                                </span>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}