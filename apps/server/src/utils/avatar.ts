import { getStorage } from "../storage";

export const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
export const MAX_AVATAR_DIMENSION = 512;
export const AVATAR_WEBP_QUALITY = 80;
const AVATAR_EXTENSIONS: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
};

export async function processAvatar(
    file: File,
    originalExt: string,
): Promise<{ data: Uint8Array | File; ext: string }> {
    if (file.type === "image/gif") return { data: file, ext: originalExt };
    try {
        const bytes = await new Bun.Image(file)
            .resize(MAX_AVATAR_DIMENSION, MAX_AVATAR_DIMENSION, { fit: "inside" })
            .webp({ quality: AVATAR_WEBP_QUALITY })
            .bytes();
        if (bytes.length < file.size) return { data: bytes, ext: "webp" };
        return { data: file, ext: originalExt };
    } catch {
        return { data: file, ext: originalExt };
    }
}

export async function saveAvatar(file: File): Promise<{ path: string } | { error: Response }> {
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        return { error: Response.json({ message: "头像仅支持 png、jpg、webp、gif 格式" }, { status: 400 }) };
    }
    if (file.size > MAX_AVATAR_SIZE) {
        return { error: Response.json({ message: "头像大小不能超过 2MB" }, { status: 400 }) };
    }
    const base = crypto.randomUUID();
    const processed = await processAvatar(file, AVATAR_EXTENSIONS[file.type]!);
    const path = await getStorage().blobs.put(processed.data, `${base}.${processed.ext}`);
    return { path };
}
