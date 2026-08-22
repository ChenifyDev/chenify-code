import { del, put } from "@vercel/blob";
import type { BlobStore } from "../../store";

const FILES_PREFIX = "chenify-files/";

export function vercelBlobStore(): BlobStore {
    return {
        async put(data, relPath) {
            const body = data instanceof Uint8Array ? new Blob([data]) : data;
            const result = await put(`${FILES_PREFIX}${relPath}`, body, {
                access: "public",
                addRandomSuffix: false,
            });
            return result.url;
        },
        async read(urlOrPath) {
            if (!/^https?:\/\//.test(urlOrPath)) return null;
            const response = await fetch(urlOrPath);
            if (!response.ok) return null;
            return await response.text();
        },
        async delete(urlOrPath) {
            if (!/^https?:\/\//.test(urlOrPath)) return;
            await del(urlOrPath).catch(() => {});
        },
    };
}
