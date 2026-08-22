import sharp from "sharp";
import { getStorage } from "@chenify/storage";
import { getAuthUser, jsonError, parsePagination } from "./util";
import { saveAvatar, type RouteMap } from "../utils";

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

async function processImage(file: File): Promise<{ data: Buffer | File; ext: string } | null> {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return null;
    if (file.size > MAX_IMAGE_SIZE) return null;
    if (file.type === "image/gif") return { data: file, ext: "gif" };
    try {
        const bytes = await sharp(await file.arrayBuffer())
            .webp({ quality: IMAGE_WEBP_QUALITY })
            .toBuffer();
        if (bytes.length < file.size) return { data: bytes, ext: "webp" };
        return { data: file, ext: IMAGE_EXTENSIONS[file.type]! };
    } catch {
        return { data: file, ext: IMAGE_EXTENSIONS[file.type]! };
    }
}

function splitTags(raw: string): string[] {
    return [
        ...new Set(
            raw
                .split(/[,，\s]+/)
                .map((tag) => tag.trim().toLowerCase())
                .filter(Boolean),
        ),
    ].slice(0, MAX_TAGS);
}

function validTags(tags: string[]): boolean {
    return tags.every((tag) => tag.length <= MAX_TAG_LENGTH);
}

async function saveImages(imageFiles: File[]): Promise<{ paths: string[] } | { error: string }> {
    const blocks = getStorage().blobs;
    const imagePaths: string[] = [];
    for (const file of imageFiles) {
        const processed = await processImage(file);
        if (!processed) {
            await deleteImageFiles(imagePaths);
            return { error: "图片仅支持 png、jpg、webp、gif 格式，且大小不能超过 2MB" };
        }
        const base = crypto.randomUUID();
        const relPath = `${base}.${processed.ext}`;
        const path = await blocks.put(processed.data, relPath);
        imagePaths.push(path);
    }
    return { paths: imagePaths };
}

async function deleteImageFiles(paths: string[]): Promise<void> {
    const blocks = getStorage().blobs;
    await Promise.all(paths.map((path) => blocks.delete(path)));
}

function numericIdError(raw: string): number | Response {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return jsonError(400, "无效的 ID");
    return id;
}

async function parseDraftForm(
    req: Request,
): Promise<{ content: string; tags: string[]; imageFiles: File[] } | { error: Response }> {
    const form = await req.formData();
    const content = form.get("content")?.toString().trim() ?? "";
    if (content.length > MAX_CONTENT_LENGTH) {
        return { error: jsonError(400, `帖子内容不能超过 ${MAX_CONTENT_LENGTH} 字`) };
    }

    const rawTags = form.get("tags")?.toString() ?? "";
    const tags = splitTags(rawTags);
    if (!validTags(tags)) return { error: jsonError(400, `单个标签不能超过 ${MAX_TAG_LENGTH} 个字符`) };

    const imageFiles: File[] = [];
    for (const entry of form.getAll("images")) {
        if (entry instanceof File) imageFiles.push(entry);
    }
    if (imageFiles.length > MAX_IMAGES) return { error: jsonError(400, `最多上传 ${MAX_IMAGES} 张图片`) };

    return { content, tags, imageFiles };
}

export const routes = {
    "/api/posts": {
        GET: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            const url = new URL(req.url);
            const { offset, limit } = parsePagination(url);
            const tag = url.searchParams.get("tag")?.trim().toLowerCase() || null;
            const sort = url.searchParams.get("sort") === "hot" ? "hot" : "latest";
            const posts = await storage.posts.listPosts({ offset, limit, tag, sort, viewerId: me?.id ?? null });
            return Response.json(posts);
        },
        POST: async (req) => {
            const storage = getStorage();
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

            const saved = await saveImages(imageFiles);
            if ("error" in saved) return jsonError(400, saved.error);

            const post = await storage.posts.createPost(me.id, content, saved.paths, tags);
            if (!post) return jsonError(500, "发帖失败");
            return Response.json(post, { status: 201 });
        },
    },

    "/api/posts/:id": {
        GET: async (req) => {
            const storage = getStorage();
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const me = await getAuthUser(req);
            const post = await storage.posts.getPostById(parsed, me?.id ?? null);
            if (!post) return jsonError(404, "帖子不存在");
            return Response.json(post);
        },
        DELETE: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = await storage.posts.getPostOwner(parsed);
            if (ownerId === null) return jsonError(404, "帖子不存在");
            if (ownerId !== me.id) return jsonError(403, "无权删除该帖子");
            const paths = await storage.posts.deletePost(parsed);
            await deleteImageFiles(paths);
            return Response.json({ success: true });
        },
    },

    "/api/posts/:id/draft": {
        GET: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = await storage.posts.getPostOwner(parsed);
            if (ownerId === null) return jsonError(404, "帖子不存在");
            if (ownerId !== me.id) return jsonError(403, "无权查看该帖子");
            const draft = await storage.drafts.getDraftByPostId(parsed);
            if (!draft) return jsonError(404, "草稿不存在");
            return Response.json({ id: draft.id, status: draft.status, post_id: draft.post_id });
        },
    },

    "/api/posts/:id/like": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.posts.getPostOwner(parsed)) === null) return jsonError(404, "帖子不存在");
            return Response.json(await storage.likes.toggleLike(me.id, parsed));
        },
        DELETE: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.posts.getPostOwner(parsed)) === null) return jsonError(404, "帖子不存在");
            return Response.json(await storage.likes.unlikePost(me.id, parsed));
        },
    },

    "/api/posts/:id/favorite": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.posts.getPostOwner(parsed)) === null) return jsonError(404, "帖子不存在");
            return Response.json(await storage.favorites.toggleFavorite(me.id, parsed));
        },
        DELETE: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.posts.getPostOwner(parsed)) === null) return jsonError(404, "帖子不存在");
            return Response.json(await storage.favorites.unfavoritePost(me.id, parsed));
        },
    },

    "/api/posts/:id/comments": {
        GET: async (req) => {
            const storage = getStorage();
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.posts.getPostOwner(parsed)) === null) return jsonError(404, "帖子不存在");
            const { offset, limit } = parsePagination(new URL(req.url), 20, 50);
            const viewer = await getAuthUser(req);
            return Response.json(await storage.comments.listComments(parsed, viewer?.id ?? null, { offset, limit }));
        },
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.posts.getPostOwner(parsed)) === null) return jsonError(404, "帖子不存在");
            const body = (await req.json().catch(() => null)) as { content?: string; parent_id?: number | null } | null;
            const content = body?.content?.trim() ?? "";
            if (!content) return jsonError(400, "评论内容不能为空");
            if (content.length > MAX_COMMENT_LENGTH) return jsonError(400, `评论不能超过 ${MAX_COMMENT_LENGTH} 字`);
            const parentId = body?.parent_id ?? null;
            if (parentId != null && !(await storage.comments.commentBelongsToPost(parentId, parsed)))
                return jsonError(400, "回复目标不在该帖子下");
            const comment = await storage.comments.createComment(me.id, parsed, content, parentId);
            if (comment) {
                try {
                    if (parentId != null) {
                        const targetOwner = await storage.comments.getCommentOwner(parentId);
                        if (targetOwner != null && targetOwner !== me.id) {
                            await storage.notifications.createNotification({
                                userId: targetOwner,
                                actorId: me.id,
                                type: "post_reply",
                                postId: parsed,
                                commentId: comment.id,
                            });
                        }
                    } else {
                        const postOwner = await storage.posts.getPostOwner(parsed);
                        if (postOwner != null && postOwner !== me.id) {
                            await storage.notifications.createNotification({
                                userId: postOwner,
                                actorId: me.id,
                                type: "post_comment",
                                postId: parsed,
                                commentId: comment.id,
                            });
                        }
                    }
                } catch (err) {
                    console.error("create notification failed", err);
                }
            }
            return Response.json(comment, { status: 201 });
        },
    },

    "/api/comments/:id/like": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.comments.getCommentOwner(parsed)) === null) return jsonError(404, "评论不存在");
            return Response.json(await storage.comments.toggleCommentLike(me.id, parsed));
        },
        DELETE: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.comments.getCommentOwner(parsed)) === null) return jsonError(404, "评论不存在");
            return Response.json(await storage.comments.unlikeComment(me.id, parsed));
        },
    },

    "/api/comments/:id": {
        DELETE: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = await storage.comments.getCommentOwner(parsed);
            if (ownerId === null) return jsonError(404, "评论不存在");
            if (ownerId !== me.id) return jsonError(403, "无权删除该评论");
            await storage.comments.deleteComment(parsed);
            return Response.json({ success: true });
        },
    },

    "/api/users/:id/follow": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (!(await storage.users.userExists(parsed))) return jsonError(404, "用户不存在");
            if (parsed === me.id) return jsonError(400, "不能关注自己");
            return Response.json(await storage.follows.toggleFollow(me.id, parsed));
        },
        DELETE: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (!(await storage.users.userExists(parsed))) return jsonError(404, "用户不存在");
            return Response.json(await storage.follows.unfollowUser(me.id, parsed));
        },
    },

    "/api/tags": {
        GET: async () => Response.json(await getStorage().tags.listTags()),
    },

    "/api/user/privacy": {
        PATCH: async (req) => {
            const storage = getStorage();
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
            await storage.users.updatePrivacy(me.id, favPublic, followPublic);
            return Response.json({ success: true });
        },
    },

    "/api/user/profile": {
        PATCH: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");

            const form = await req.formData();
            const username = form.get("username")?.toString().trim() ?? "";
            const avatarFile = form.get("avatar");
            const removeAvatar = form.get("remove_avatar") === "1";

            let avatar: string | null | undefined;
            if (removeAvatar) {
                avatar = null;
            } else if (avatarFile instanceof File && avatarFile.size > 0) {
                const saved = await saveAvatar(avatarFile);
                if ("error" in saved) return saved.error;
                avatar = saved.path;
            }

            if (!username && avatar === undefined) {
                return jsonError(400, "请提供要修改的内容");
            }
            if (username) {
                if (username.length < 2 || username.length > 32) {
                    return jsonError(400, "用户名长度需在 2-32 个字符之间");
                }
                const existing = await storage.users.findUserByUsername(username);
                if (existing && existing.id !== me.id) {
                    return jsonError(409, "该用户名已被使用");
                }
            }

            const updated = await storage.users.updateUserProfile(me.id, {
                username: username || undefined,
                avatar,
            });
            if (!updated) return jsonError(500, "更新失败");

            if (me.avatar) {
                await storage.blobs.delete(me.avatar).catch(() => {});
            }

            return Response.json(updated);
        },
    },

    "/api/drafts": {
        GET: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const url = new URL(req.url);
            const { offset, limit } = parsePagination(url);
            const status = url.searchParams.get("status") as "draft" | "published" | null;
            const parsed = status === "draft" || status === "published" ? status : undefined;
            return Response.json(await storage.drafts.listDrafts(me.id, { offset, limit, status: parsed }));
        },
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = await parseDraftForm(req);
            if ("error" in parsed) return parsed.error;
            const saved = await saveImages(parsed.imageFiles);
            if ("error" in saved) return jsonError(400, saved.error);
            const draft = await storage.drafts.createDraft(me.id, parsed.content, saved.paths, parsed.tags);
            return Response.json(draft, { status: 201 });
        },
    },

    "/api/drafts/:id": {
        GET: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = await storage.drafts.getDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权查看该草稿");
            return Response.json(await storage.drafts.getDraftById(parsed));
        },
        PATCH: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = await storage.drafts.getDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权修改该草稿");

            const formData = await parseDraftForm(req);
            if ("error" in formData) return formData.error;
            const saved = await saveImages(formData.imageFiles);
            if ("error" in saved) return jsonError(400, saved.error);

            const { draft, removedImages } = await storage.drafts.updateDraft(
                parsed,
                formData.content,
                saved.paths,
                formData.tags,
            );
            await deleteImageFiles(removedImages);
            if (!draft) return jsonError(500, "更新草稿失败");
            return Response.json(draft);
        },
        DELETE: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = await storage.drafts.getDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权删除该草稿");
            const paths = await storage.drafts.deleteDraft(parsed);
            await deleteImageFiles(paths);
            return Response.json({ success: true });
        },
    },

    "/api/drafts/:id/publish": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = await storage.drafts.getDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权发布该草稿");
            const draft = await storage.drafts.getDraftById(parsed);
            if (!draft) return jsonError(404, "草稿不存在");
            if (!draft.content) return jsonError(400, "发布内容不能为空");
            if (draft.status === "published") return jsonError(400, "草稿已发布，请勿重复发布");
            const result = await storage.drafts.publishDraft(parsed);
            if (!result) return jsonError(500, "发布失败");
            return Response.json(result.post, { status: 201 });
        },
    },

    "/api/drafts/:id/unpublish": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = await storage.drafts.getDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权取消发布该草稿");
            const draft = await storage.drafts.getDraftById(parsed);
            if (!draft) return jsonError(404, "草稿不存在");
            if (draft.status !== "published") return jsonError(400, "该草稿尚未发布");
            const updated = await storage.drafts.unpublishDraft(parsed);
            if (!updated) return jsonError(500, "取消发布失败");
            return Response.json(updated);
        },
    },
} satisfies RouteMap;
