import type { StoragePlugin } from "../../plugin";
import { sqliteCollectionStore } from "./store";
import { sqliteBlobStore } from "./blobs";

export function sqliteStoragePlugin(): StoragePlugin {
    return {
        name: "sqlite",
        store: sqliteCollectionStore(),
        blobs: sqliteBlobStore(),
    };
}
