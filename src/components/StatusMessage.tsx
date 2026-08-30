export type FormStatus = { type: "error" | "success"; text: string } | null;

export function StatusMessage({ status }: { status: FormStatus }) {
    if (!status) return null;
    const tone =
        status.type === "error"
            ? "text-destructive bg-destructive/10 dark:bg-destructive/20"
            : "text-foreground bg-muted";
    return (
        <div className={`rounded-md px-3 py-2 text-sm ${tone}`} role={status.type === "error" ? "alert" : "status"}>
            {status.text}
        </div>
    );
}