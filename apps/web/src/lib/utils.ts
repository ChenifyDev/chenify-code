import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export async function urlToFile(imageUrl: string) {
    const res = await fetch(imageUrl, { mode: "cors" });
    if (!res.ok) return;
    const blob = await res.blob();
    return new File([blob], uuidv4(), { type: blob.type });
}
