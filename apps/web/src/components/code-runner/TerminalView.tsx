import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";

export interface TerminalHandle {
    write: (data: string) => void;
    clear: () => void;
    backspace: (cells: number) => void;
    fit: () => void;
    cols: () => number;
    rows: () => number;
    focus: () => void;
}

interface TerminalViewProps {
    className?: string;
    onData?: (data: string) => void;
    onResize?: (cols: number, rows: number) => void;
}

const darkXtermTheme = {
    background: "#0b0d10",
    foreground: "#e2e8f0",
    cursor: "#7dd3fc",
    selectionBackground: "#3b82f633",
    black: "#0b0d10",
    red: "#f87171",
    green: "#4ade80",
    yellow: "#facc15",
    blue: "#60a5fa",
    magenta: "#c084fc",
    cyan: "#22d3ee",
    white: "#e2e8f0",
    brightBlack: "#64748b",
    brightRed: "#fca5a5",
    brightGreen: "#86efac",
    brightYellow: "#fde047",
    brightBlue: "#93c5fd",
    brightMagenta: "#d8b4fe",
    brightCyan: "#67e8f9",
    brightWhite: "#f8fafc",
};

// 浅色终端配色
const lightXtermTheme = {
    background: "#ffffff",
    foreground: "#1e293b",
    cursor: "#0284c7",
    selectionBackground: "#3b82f622",
    black: "#1e293b",
    red: "#dc2626",
    green: "#16a34a",
    yellow: "#ca8a04",
    blue: "#2563eb",
    magenta: "#9333ea",
    cyan: "#0891b2",
    white: "#f8fafc",
    brightBlack: "#475569",
    brightRed: "#ef4444",
    brightGreen: "#22c55e",
    brightYellow: "#eab308",
    brightBlue: "#3b82f6",
    brightMagenta: "#a855f7",
    brightCyan: "#06b6d4",
    brightWhite: "#ffffff",
};

const FONT = `"JetBrains Mono", "Cascadia Code", "Fira Code", ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace`;

function getResolvedTheme(setting: "light" | "dark" | "system"): "light" | "dark" {
    if (setting !== "system") return setting;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const TerminalView = forwardRef<TerminalHandle, TerminalViewProps>(function TerminalView(
    { className, onData, onResize },
    ref,
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const onDataRef = useRef(onData);
    const onResizeRef = useRef(onResize);
    onDataRef.current = onData;
    onResizeRef.current = onResize;

    const { theme } = useTheme();
    const [resolvedMode, setResolvedMode] = useState(getResolvedTheme(theme));

    useEffect(() => {
        const update = () => {
            setResolvedMode(getResolvedTheme(theme));
        };
        update();

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, [theme]);

    useEffect(() => {
        const term = termRef.current;
        if (!term) return;
        term.options.theme = resolvedMode === "dark" ? darkXtermTheme : lightXtermTheme;
    }, [resolvedMode]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const activeTheme = getResolvedTheme(theme);
        const initTheme = activeTheme === "dark" ? darkXtermTheme : lightXtermTheme;

        const term = new Terminal({
            fontFamily: FONT,
            fontSize: 13,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: "block",
            scrollback: 5000,
            allowProposedApi: true,
            theme: initTheme,
        });

        const fitAddon = new FitAddon();
        const linksAddon = new WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(linksAddon);
        term.open(container);
        term.focus();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        const reportSize = () => {
            try {
                fitAddon.fit();
                onResizeRef.current?.(term.cols, term.rows);
            } catch {
                // 容器尚未完成布局，忽略
            }
        };

        const termDisposable = term.onData((data) => {
            onDataRef.current?.(data);
        });

        const observer = new ResizeObserver(() => {
            reportSize();
        });
        observer.observe(container);
        reportSize();

        return () => {
            observer.disconnect();
            termDisposable.dispose();
            term.dispose();
            termRef.current = null;
            fitAddonRef.current = null;
        };
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            write: (data: string) => termRef.current?.write(data),
            clear: () => termRef.current?.clear(),
            backspace: (cells: number) => {
                const t = termRef.current;
                if (!t) return;
                let n = Math.max(1, Math.floor(cells));
                if (n > 4) n = 4;
                t.write("\b \b".repeat(n));
            },
            fit: () => {
                try {
                    fitAddonRef.current?.fit();
                } catch {
                    // ignore
                }
            },
            cols: () => termRef.current?.cols ?? 80,
            rows: () => termRef.current?.rows ?? 24,
            focus: () => termRef.current?.focus(),
        }),
        [],
    );

    return <div ref={containerRef} className={cn("size-full overflow-hidden p-2", className)} />;
});
