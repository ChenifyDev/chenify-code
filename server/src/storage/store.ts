export interface CollectionStore {
    read<T>(name: string): Promise<T[]>;
    write<T>(name: string, rows: T[]): Promise<void>;
    insert<T extends { id: number }>(name: string, row: Omit<T, "id">): Promise<T>;
    append<T>(name: string, row: T): Promise<T>;
    getById<T extends { id: number }>(name: string, id: number): Promise<T | undefined>;
    updateById<T extends { id: number }>(name: string, id: number, patch: Partial<T>): Promise<T | undefined>;
    deleteWhere<T>(name: string, predicate: (row: T) => boolean): Promise<void>;
    removeById(name: string, id: number): Promise<void>;
    insertIfAbsent<T extends { id: number }>(name: string, row: T): Promise<void>;
}

export interface BlobStore {
    put(data: Uint8Array | Blob | File, relPath: string): Promise<string>;
    delete(urlOrPath: string): Promise<void>;
}
