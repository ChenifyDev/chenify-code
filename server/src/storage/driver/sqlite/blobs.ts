import { unlink } from "node:fs/promises";
import type { BlobStore } from "../../store";

const UPLOADS_DIR = "./uploads";

export function sqliteBlobStore(): BlobStore {
    return {
        async put(data, relPath) {
            await Bun.write(`${UPLOADS_DIR}/${relPath}`, data);
            return `/uploads/${relPath}`;
        },
        async read(urlOrPath) {
            const rel = urlOrPath.replace(/^\/uploads\//, "");
            if (rel === urlOrPath || rel.includes("/") || rel.includes("\\") || rel.includes("..")) return null;
            const file = Bun.file(`${UPLOADS_DIR}/${rel}`);
            if (!(await file.exists())) return null;
            return await file.text();
        },
        async delete(urlOrPath) {
            const rel = urlOrPath.replace(/^\/uploads\//, "");
            if (rel === urlOrPath || rel.includes("/") || rel.includes("\\") || rel.includes("..")) return;
            await unlink(`${UPLOADS_DIR}/${rel}`).catch(() => {});
        },
    };
}
