import { useEffect, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const ASPECT = 3 / 2;
const OUT_W = 1280;
const OUT_H = 853;

function cropToFile(
    img: HTMLImageElement,
    pixelCrop: PixelCrop,
    targetWidth: number,
    targetHeight: number,
): Promise<File | null> {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, targetWidth, targetHeight);
    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) return resolve(null);
                resolve(new File([blob], "cover.webp", { type: "image/webp" }));
            },
            "image/webp",
            0.85,
        );
    });
}

export function CoverCropper({
    coverUrl,
    onConfirm,
    onCancel,
}: {
    coverUrl: string;
    onConfirm: (file: File) => void;
    onCancel: () => void;
}) {
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);
    const [crop, setCrop] = useState<Crop>();
    const [working, setWorking] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = coverUrl;
    }, [coverUrl]);

    useEffect(() => {
        if (!size) return;
        const imgAspect = size.w / size.h;
        if (imgAspect >= ASPECT) {
            setCrop({
                unit: "%",
                x: ((1 - ASPECT / imgAspect) / 2) * 100,
                y: 0,
                width: (ASPECT / imgAspect) * 100,
                height: 100,
            });
        } else {
            setCrop({
                unit: "%",
                x: 0,
                y: ((1 - imgAspect / ASPECT) / 2) * 100,
                width: 100,
                height: (imgAspect / ASPECT) * 100,
            });
        }
    }, [size]);

    const handleConfirm = async () => {
        if (!size || !crop || crop.width < 1) return;
        setWorking(true);
        try {
            const img = new Image();
            img.onload = async () => {
                const pixelCrop: PixelCrop = {
                    x: (crop.x / 100) * size.w,
                    y: (crop.y / 100) * size.h,
                    width: (crop.width / 100) * size.w,
                    height: (crop.height / 100) * size.h,
                    unit: "px",
                };
                const file = await cropToFile(img, pixelCrop, OUT_W, OUT_H);
                setWorking(false);
                if (file) onConfirm(file);
            };
            img.src = coverUrl;
        } catch {
            setWorking(false);
        }
    };

    return (
        <div className="grid gap-3">
            <div className="flex max-h-[42vh] items-start justify-center overflow-hidden rounded-lg bg-muted/40 p-2">
                {size ? (
                    <ReactCrop
                        crop={crop}
                        aspect={ASPECT}
                        minWidth={10}
                        keepSelection
                        ruleOfThirds
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                    >
                        <img src={coverUrl} alt="封面裁剪" className="max-h-[40vh] w-auto" />
                    </ReactCrop>
                ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        加载图片中…
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" disabled={working} onClick={onCancel}>
                    取消
                </Button>
                <Button size="sm" disabled={working || !size || !crop} onClick={() => void handleConfirm()}>
                    {working && <Loader2 className="animate-spin" />}
                    确认裁切
                </Button>
            </div>
        </div>
    );
}
