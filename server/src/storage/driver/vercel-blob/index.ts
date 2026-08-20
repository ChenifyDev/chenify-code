import type { StoragePlugin } from "../../plugin";
import type { CollectionStore } from "../../store";
import { BlobDocStore } from "./doc";
import { DataStore } from "./store";
import { vercelBlobStore } from "./blobs";

export function vercelBlobStoragePlugin(): StoragePlugin {
    const doc = new BlobDocStore();
    doc.warmup().catch(() => {});
    return {
        name: "vercel-blob",
        store: new DataStore(doc) as CollectionStore,
        blobs: vercelBlobStore(),
    };
}
