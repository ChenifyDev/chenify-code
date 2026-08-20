import { list, put } from "@vercel/blob";

const BASE = "chenify-db/";

export class BlobDocStore {
    private paths = new Map<string, string>();

    async warmup(): Promise<void> {
        try {
            const { blobs } = await list({ prefix: BASE, limit: 1000 });
            for (const b of blobs) this.paths.set(b.pathname, b.url);
        } catch {
            // 尚未配置 BLOB 令牌时忽略，写入/读取时会再次报错
        }
    }

    private async collectionUrl(name: string): Promise<string | null> {
        const path = `${BASE}${name}.json`;
        const cached = this.paths.get(path);
        if (cached) return cached;
        try {
            const { blobs } = await list({ prefix: BASE, limit: 1000 });
            for (const b of blobs) this.paths.set(b.pathname, b.url);
        } catch {
            return null;
        }
        return this.paths.get(path) ?? null;
    }

    async read<T>(name: string): Promise<T[]> {
        const url = await this.collectionUrl(name);
        if (!url) return [];
        try {
            const res = await fetch(url);
            if (!res.ok) return [];
            const text = await res.text();
            if (!text.trim()) return [];
            return JSON.parse(text) as T[];
        } catch {
            return [];
        }
    }

    async write<T>(name: string, rows: T[]): Promise<void> {
        const path = `${BASE}${name}.json`;
        const result = await put(path, JSON.stringify(rows), {
            access: "public",
            addRandomSuffix: false,
        });
        this.paths.set(path, result.url);
    }
}
