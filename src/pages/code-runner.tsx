import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { CheckCircle2, CircleDashed, Play, Square } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { TerminalView, type TerminalHandle } from "@/components/code-runner/TerminalView";
import { DangerDialog } from "@/components/code-runner/DangerDialog";
import { useWebtty, type ConnStatus } from "@/lib/coding-helper/useWebtty";
import { fetchWork, loadWorkForRunner, type RunnerWork } from "@/lib/server-works";
import type { DangerItem, S2CMessage } from "@/lib/coding-helper/protocol";
import { cn } from "@/lib/utils.ts";

const PROJECT_ID = "6";

const STATUS_META: Record<
    ConnStatus,
    {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
        color: string;
    }
> = {
    idle: { label: "未连接", variant: "outline", color: "bg-secondary text-secondary-foreground" },
    discovering: { label: "探测服务", variant: "outline", color: "text-blue-500 dark:text-blue‑400" },
    connecting: { label: "连接中", variant: "outline", color: "text-amber-500 dark:text-amber‑400" },
    connected: { label: "已连接", variant: "outline", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    ended: { label: "已结束", variant: "outline", color: "text-slate-500 dark:text-slate‑400" },
    error: { label: "连接失败", variant: "outline", color: "bg-red-600 hover:bg-red-700 text-white" },
};

interface DangerRequest {
    items: DangerItem[];
    timeoutSecs: number;
}

export default function CodeRunner({ id, className }: { id?: number; className?: string }) {
    const [running, setRunning] = useState(false);
    const [danger, setDanger] = useState<DangerRequest | null>(null);
    const [workTitle, setWorkTitle] = useState<string | null>(null);
    const hasInitConnect = useRef(false);

    const [searchParams] = useSearchParams();
    const [workId, setWorkId] = useState<number | undefined>(id);
    useEffect(() => {
        let ignore = false;
        if (!workId && !ignore) setWorkId(Number(searchParams.get("work")) || 1);
        return () => {
            ignore = true;
        };
    }, [searchParams, workId]);

    const termRef = useRef<TerminalHandle>(null);

    useEffect(() => {
        let cancelled = false;
        if (!workId) return;
        setWorkTitle(null);
        fetchWork(workId)
            .then((work) => {
                if (!cancelled) setWorkTitle(work.title);
            })
            .catch(() => {
                if (!cancelled) setWorkTitle(null);
            });
        return () => {
            cancelled = true;
        };
    }, [workId]);

    const handleMessage = useCallback((msg: S2CMessage) => {
        const term = termRef.current;
        switch (msg.kind) {
            case "output":
                term?.write(msg.data);
                break;
            case "backspace":
                term?.backspace(msg.cells);
                break;
            case "runInfo":
                term?.write(`\x1b[38;5;245m${msg.info}\x1b[0m`);
                break;
            case "compileFail":
                term?.write(`\x1b[31m${msg.info}\x1b[0m`);
                setRunning(false);
                break;
            case "signal":
                if (msg.signalKind === "flask" && msg.host) {
                    toast("Web 服务已启动", {
                        description: msg.host,
                        action: {
                            label: "打开",
                            onClick: () => window.open(msg.host, "_blank"),
                        },
                    });
                } else if (msg.signalKind === "file_err") {
                    toast.error("资源处理失败", { description: msg.reason ?? "" });
                } else if (msg.signalKind === "changed") {
                    toast.info("运行期间文件有变动");
                }
                break;
            case "assets":
                break;
            case "dangerConfirm":
                setDanger({ items: msg.items, timeoutSecs: msg.timeoutSecs });
                break;
            case "lint":
                break;
        }
    }, []);

    const {
        status: connStatus,
        wsPort,
        httpPort,
        isConnected,
        connect,
        send,
    } = useWebtty({ onMessage: handleMessage });

    useEffect(() => {
        if (connStatus === "ended" || connStatus === "error") {
            setRunning(false);
        }
    }, [connStatus]);

    useEffect(() => {
        if (connStatus === "connected") {
            send({
                kind: "resize",
                cols: termRef.current?.cols() ?? 80,
                rows: termRef.current?.rows() ?? 24,
            });
        }
    }, [connStatus, send]);

    const sendTerminal = useCallback(
        (data: string) => {
            send({ kind: "input", data });
        },
        [send],
    );

    const sendResize = useCallback(
        (cols: number, rows: number) => {
            send({ kind: "resize", cols, rows });
        },
        [send],
    );

    useEffect(() => {
        if (hasInitConnect.current) return;
        hasInitConnect.current = true;
        void connect()
            .then(() => toast.success("已连接 coding‑helper 服务"))
            .catch(() => toast.error("连接失败，请确认后端已启动"));
    }, [connect]);

    const run = useCallback(async () => {
        if (!workId) return;
        if (!isConnected) {
            try {
                await connect();
            } catch {
                return;
            }
        }
        if (httpPort == null) return;
        let loaded: RunnerWork;
        try {
            loaded = await loadWorkForRunner(workId);
        } catch (err) {
            toast.error("加载作品失败", {
                description: `work: ${workId} · ${err instanceof Error ? err.message : String(err)}`,
            });
            return;
        }
        setWorkTitle(loaded.title);
        const main = loaded.main ?? loaded.files[0];
        if (!main) {
            toast.error("作品中没有可运行的文件");
            return;
        }
        termRef.current?.clear();
        setRunning(true);
        send({
            kind: "run",
            projectId: PROJECT_ID,
            path: main.path,
            code: main.content,
            files: loaded.files,
            assets: [],
            preload: null,
            cols: termRef.current?.cols() ?? 80,
            rows: termRef.current?.rows() ?? 24,
        });
    }, [isConnected, connect, httpPort, send, workId]);

    const stop = useCallback(() => {
        send({ kind: "stop" });
        setRunning(false);
    }, [send]);

    const replyDanger = useCallback(
        (allow: boolean) => {
            send({ kind: "dangerReply", allow });
            setDanger(null);
        },
        [send],
    );

    const handleAllowDanger = useCallback(() => replyDanger(true), [replyDanger]);
    const handleDenyDanger = useCallback(() => replyDanger(false), [replyDanger]);

    const status = STATUS_META[connStatus];

    return (
        <div className={cn("flex h-svh flex-col overflow-hidden text-foreground", className)}>
            <header className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5 backdrop-blur">
                <Badge variant={status.variant} className={cn("gap-1.5", status.color)}>
                    {connStatus === "connected" ? (
                        <CheckCircle2 className="size-3" />
                    ) : (
                        <CircleDashed className="size-3 animate-spin" />
                    )}
                    {status.label}
                </Badge>

                <div className="ml-auto flex items-center gap-2">
                    <span className="max-w-64 truncate text-xs text-muted-foreground">
                        {workTitle ? workTitle : `work: ${workId}`}
                        {isConnected ? ` · ws://127.0.0.1:${wsPort}` : ""}
                    </span>

                    <Separator orientation="vertical" className="h-6" />

                    <Button variant="destructive" size="sm" disabled={!running} onClick={stop}>
                        <Square className="size-3.5 fill-current" />
                        停止
                    </Button>
                    <Button
                        size="sm"
                        disabled={connStatus === "connecting" || connStatus === "discovering"}
                        onClick={() => void run()}
                    >
                        <Play className="size-3.5 fill-current" />
                        运行
                    </Button>
                </div>
            </header>

            <main className="min-h-0 flex-1">
                <TerminalView ref={termRef} className="size-full" onData={sendTerminal} onResize={sendResize} />
            </main>

            <DangerDialog
                open={danger != null}
                items={danger?.items ?? []}
                timeoutSecs={danger?.timeoutSecs ?? 0}
                onAllow={handleAllowDanger}
                onDeny={handleDenyDanger}
            />

            <Toaster richColors position="top-center" />
        </div>
    );
}
