import { Search } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";

export interface SearchBoxProps {
    value: string;
    onValueChange: (value: string) => void;
    onSubmit: (keyword: string) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

export default function SearchBox({
    value,
    onValueChange,
    onSubmit,
    placeholder = "搜索帖子、作品、用户…",
    className,
    autoFocus,
}: SearchBoxProps) {
    return (
        <form
            className={cn("flex items-center gap-2", className)}
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(value.trim());
            }}
        >
            <Input
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
            />
            <Button type="submit" size="icon" className="h-8 w-8 shrink-0" aria-label="搜索">
                <Search className="size-4" />
            </Button>
        </form>
    );
}
