import type { BlobStore } from "./store";

export async function saveContentBlob(blobStore: BlobStore, content: string): Promise<string> {
    const name = `${crypto.randomUUID()}.txt`;
    return blobStore.put(new TextEncoder().encode(content), name);
}

export async function loadContentBlob(blobStore: BlobStore, content: string | null | undefined): Promise<string> {
    if (!content) return "";
    return (await blobStore.read(content)) ?? "";
}

export async function deleteContentBlob(blobStore: BlobStore, content: string | null | undefined): Promise<void> {
    if (!content) return;
    await blobStore.delete(content).catch(() => {});
}
