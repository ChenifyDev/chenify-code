import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import type { BlobStore } from "../../store";

const UPLOADS_DIR = "./uploads";

export function sqliteBlobStore(): BlobStore {
    return {
        async put(data, relPath) {
            const buffer =
                data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : Buffer.from(data as any);
            await writeFile(`${UPLOADS_DIR}/${relPath}`, buffer);
            return `/uploads/${relPath}`;
        },
        async read(urlOrPath) {
            const rel = urlOrPath.replace(/^\/uploads\//, "");
            if (rel === urlOrPath || rel.includes("/") || rel.includes("\\") || rel.includes("..")) return null;
            const file = `${UPLOADS_DIR}/${rel}`;
            try {
                if (!(await stat(file)).isFile()) return null;
                return await readFile(file, "utf-8");
            } catch {
                return null;
            }
        },
        async delete(urlOrPath) {
            const rel = urlOrPath.replace(/^\/uploads\//, "");
            if (rel === urlOrPath || rel.includes("/") || rel.includes("\\") || rel.includes("..")) return;
            await unlink(`${UPLOADS_DIR}/${rel}`).catch(() => {});
        },
    };
}