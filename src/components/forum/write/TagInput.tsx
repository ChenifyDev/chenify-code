import { Input } from "@/components/ui/input.tsx";

type TagInputProps = {
    value: string;
    onChange: (value: string) => void;
    tags: string[];
};

export function TagInput({ value, onChange, tags }: TagInputProps) {
    return (
        <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">标签（用逗号或空格分隔）</span>
            <Input value={value} onChange={(e) => onChange(e.target.value)} />
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}