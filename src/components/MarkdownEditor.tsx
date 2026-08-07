export default function EditorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="在这里写文章…"
            className="min-h-[50vh] w-full resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground"
        />
    );
}
