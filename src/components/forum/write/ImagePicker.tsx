import { ImagePlus, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

type ImagePickerProps = {
    images: File[];
    max: number;
    onPick: (files: FileList | null) => void;
    onRemove: (index: number) => void;
};

export function ImagePicker({ images, max, onPick, onRemove }: ImagePickerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">图片（最多 {max} 张）</span>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => {
                    onPick(e.target.files);
                    e.target.value = "";
                }}
            />
            {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {images.map((file, i) => (
                        <div key={i} className="relative">
                            <img
                                src={URL.createObjectURL(file)}
                                alt={`图片 ${i + 1}`}
                                className={cn("size-20 rounded-md object-cover")}
                            />
                            <Button
                                variant="destructive"
                                size="icon-xs"
                                className="absolute -top-1.5 -right-1.5"
                                aria-label="移除图片"
                                onClick={() => onRemove(i)}
                            >
                                <X />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            <div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={images.length >= max}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <ImagePlus />
                    添加图片
                </Button>
            </div>
        </div>
    );
}