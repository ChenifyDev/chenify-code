import type { StoragePlugin } from "../../plugin";
import { neonCollectionStore } from "./store";
import { vercelBlobStore } from "../vercel-blob/blobs";

export function neonStoragePlugin(): StoragePlugin {
    return {
        name: "neon",
        store: neonCollectionStore(),
        blobs: vercelBlobStore(),
    };
}