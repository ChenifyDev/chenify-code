import { unlink } from "node:fs/promises";
import {
    createComment,
    createPost,
    deleteComment,
    deletePost,
    getCommentOwner,
    getPostById,
    getPostOwner,
    listComments,
    listPosts,
    listTags,
    toggleFavorite,
    toggleFollow,
    toggleLike,
    unfavoritePost,
    unfollowUser,
    unlikePost,
    updatePrivacy,
    userExists,
} from "../db";
import { getAuthUser, jsonError, parsePagination } from "./util";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const IMAGE_EXTENSIONS: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
};
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGES = 9;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 20;
const MAX_CONTENT_LENGTH = 20000;
const MAX_COMMENT_LENGTH = 5000;
const IMAGE_WEBP_QUALITY = 80;

async function processImage(file: File): Promise<{ data: Uint8Array | File; ext: string } | null> {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return null;
    if (file.size > MAX_IMAGE_SIZE) return null;
    if (file.type === "image/gif") return { data: file, ext: "gif" };
    try {
        const bytes = await new Bun.Image(file).webp({ quality: IMAGE_WEBP_QUALITY }).bytes();
        if (bytes.length < file.size) return { data: bytes, ext: "webp" };
        return { data: file, ext: IMAGE_EXTENSIONS[file.type]! };
    } catch {
        return { data: file, ext: IMAGE_EXTENSIONS[file.type]! };
    }
}

function splitTags(raw: string): string[] {
    return [...new Set(raw.split(/[,，\s]+/).map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_TAGS);
}

function validTags(tags: string[]): boolean {
    return tags.every((tag) => tag.length <= MAX_TAG_LENGTH);
}

function numericIdError(raw: string): number | Response {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return jsonError(400, "无效的 ID");
    return id;
}

export const routes: Bun.Serve.Routes<any, any> = {
    "/api/posts": {
        GET: async (req) => {
            const me = await getAuthUser(req);
            const url = new URL(req.url);
            const { offset, limit } = parsePagination(url);
            const tag = url.searchParams.get("tag")?.trim().toLowerCase() || null;
            const posts = listPosts({ offset, limit, tag, viewerId: me?.id ?? null });
            return Response.json(posts);
        },
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");

            const form = await req.formData();
            const content = form.get("content")?.toString().trim() ?? "";
            if (!content) return jsonError(400, "帖子内容不能为空");
            if (content.length > MAX_CONTENT_LENGTH) return jsonError(400, `帖子内容不能超过 ${MAX_CONTENT_LENGTH} 字`);

            const rawTags = form.get("tags")?.toString() ?? "";
            const tags = splitTags(rawTags);
            if (!validTags(tags)) return jsonError(400, `单个标签不能超过 ${MAX_TAG_LENGTH} 个字符`);

            const imageFiles: File[] = [];
            for (const entry of form.getAll("images")) {
                if (entry instanceof File) imageFiles.push(entry);
            }
            if (imageFiles.length > MAX_IMAGES) return jsonError(400, `最多上传 ${MAX_IMAGES} 张图片`);

            const imagePaths: string[] = [];
            for (const file of imageFiles) {
                const processed = await processImage(file);
                if (!processed) {
                    for (const path of imagePaths) await unlink(path.replace(/^\//, "")).catch(() => {});
                    return jsonError(400, "图片仅支持 png、jpg、webp、gif 格式，且大小不能超过 2MB");
                }
                const base = crypto.randomUUID();
                const relPath = `${base}.${processed.ext}`;
                await Bun.write(`./uploads/${relPath}`, processed.data);
                imagePaths.push(`/uploads/${relPath}`);
            }

            const post = createPost(me.id, content, imagePaths, tags);
            if (!post) return jsonError(500, "发帖失败");
            return Response.json(post, { status: 201 });
        },
    },

    "/api/posts/:id": {
        GET: async (req) => {
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const me = await getAuthUser(req);
            const post = getPostById(parsed, me?.id ?? null);
            if (!post) return jsonError(404, "帖子不存在");
            return Response.json(post);
        },
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getPostOwner(parsed);
            if (ownerId === null) return jsonError(404, "帖子不存在");
            if (ownerId !== me.id) return jsonError(403, "无权删除该帖子");
            const paths = deletePost(parsed);
            for (const path of paths) await unlink(path.replace(/^\//, "")).catch(() => {});
            return Response.json({ success: true });
        },
    },

    "/api/posts/:id/like": {
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getPostOwner(parsed) === null) return jsonError(404, "帖子不存在");
            return Response.json(toggleLike(me.id, parsed));
        },
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getPostOwner(parsed) === null) return jsonError(404, "帖子不存在");
            return Response.json(unlikePost(me.id, parsed));
        },
    },

    "/api/posts/:id/favorite": {
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getPostOwner(parsed) === null) return jsonError(404, "帖子不存在");
            return Response.json(toggleFavorite(me.id, parsed));
        },
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getPostOwner(parsed) === null) return jsonError(404, "帖子不存在");
            return Response.json(unfavoritePost(me.id, parsed));
        },
    },

    "/api/posts/:id/comments": {
        GET: async (req) => {
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getPostOwner(parsed) === null) return jsonError(404, "帖子不存在");
            const { offset, limit } = parsePagination(new URL(req.url), 20, 50);
            return Response.json(listComments(parsed, { offset, limit }));
        },
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getPostOwner(parsed) === null) return jsonError(404, "帖子不存在");
            const body = (await req.json().catch(() => null)) as { content?: string } | null;
            const content = body?.content?.trim() ?? "";
            if (!content) return jsonError(400, "评论内容不能为空");
            if (content.length > MAX_COMMENT_LENGTH) return jsonError(400, `评论不能超过 ${MAX_COMMENT_LENGTH} 字`);
            const comment = createComment(me.id, parsed, content);
            return Response.json(comment, { status: 201 });
        },
    },

    "/api/comments/:id": {
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getCommentOwner(parsed);
            if (ownerId === null) return jsonError(404, "评论不存在");
            if (ownerId !== me.id) return jsonError(403, "无权删除该评论");
            deleteComment(parsed);
            return Response.json({ success: true });
        },
    },

    "/api/users/:id/follow": {
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (!userExists(parsed)) return jsonError(404, "用户不存在");
            if (parsed === me.id) return jsonError(400, "不能关注自己");
            return Response.json(toggleFollow(me.id, parsed));
        },
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (!userExists(parsed)) return jsonError(404, "用户不存在");
            return Response.json(unfollowUser(me.id, parsed));
        },
    },

    "/api/tags": {
        GET: () => Response.json(listTags()),
    },

    "/api/user/privacy": {
        PATCH: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const body = (await req.json().catch(() => null)) as {
                is_favorites_public?: boolean;
                is_follows_public?: boolean;
            } | null;
            const favPublic = typeof body?.is_favorites_public === "boolean" ? body.is_favorites_public : undefined;
            const followPublic = typeof body?.is_follows_public === "boolean" ? body.is_follows_public : undefined;
            if (favPublic === undefined && followPublic === undefined) {
                return jsonError(400, "至少提供一个设置项");
            }
            updatePrivacy(me.id, favPublic, followPublic);
            return Response.json({ success: true });
        },
    },
};