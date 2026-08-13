import { unlink } from "node:fs/promises";
import { createNotification, userExists } from "../db";
import {
    createWork,
    createWorkComment,
    createWorkDraft,
    deleteWork,
    deleteWorkComment,
    deleteWorkDraft,
    getWorkById,
    getWorkCommentOwner,
    getWorkDraftById,
    getWorkDraftOwner,
    getWorkOwner,
    listForks,
    listWorkComments,
    listWorkDrafts,
    listWorks,
    publishWorkDraft,
    toggleWorkCommentLike,
    toggleWorkFavorite,
    toggleWorkLike,
    unfavoriteWork,
    unlikeWork,
    unlikeWorkComment,
    unpublishWorkDraft,
    updateWork,
    updateWorkDraft,
    workCommentBelongsToWork,
} from "../works";
import { getAuthUser, jsonError, parsePagination } from "./util";

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_WORK_FILES = 20;
const MAX_WORK_FILE_SIZE = 1024 * 1024;
const MAX_COMMENT_LENGTH = 5000;

const ALLOWED_COVER_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_COVER_SIZE = 2 * 1024 * 1024;
const COVER_WIDTH = 1280;
const COVER_HEIGHT = 853;
const COVER_WEBP_QUALITY = 80;

type RequestFormData = NonNullable<Awaited<ReturnType<Request["formData"]>>>;

function numericIdError(raw: string): number | Response {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return jsonError(400, "无效的 ID");
    return id;
}

function fileExtension(filename: string): string {
    const dot = filename.lastIndexOf(".");
    if (dot < 1 || dot === filename.length - 1) return "txt";
    const ext = filename.slice(dot + 1);
    return /^[a-zA-Z0-9]{1,8}$/.test(ext) ? ext : "txt";
}

async function saveWorkFiles(
    files: File[],
): Promise<{ rows: { name: string; path: string; size: number }[]; error?: string }> {
    const rows: { name: string; path: string; size: number }[] = [];
    for (const file of files) {
        if (file.size > MAX_WORK_FILE_SIZE) {
            return { rows: [], error: `单个文件不能超过 ${MAX_WORK_FILE_SIZE / 1024 / 1024}MB` };
        }
        const base = crypto.randomUUID();
        const ext = fileExtension(file.name);
        const relPath = `${base}.${ext}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        await Bun.write(`./uploads/${relPath}`, bytes);
        rows.push({ name: file.name, path: `/uploads/${relPath}`, size: file.size });
    }
    return { rows };
}

async function deleteFilePaths(paths: string[]): Promise<void> {
    await Promise.all(paths.map((p) => unlink(p.replace(/^\//, "")).catch(() => {})));
}

async function parseNonEmptyTitle(form: RequestFormData): Promise<string | Response> {
    const title = form.get("title")?.toString().trim() ?? "";
    if (!title) return jsonError(400, "作品标题不能为空");
    if (title.length > MAX_TITLE_LENGTH) return jsonError(400, `作品标题不能超过 ${MAX_TITLE_LENGTH} 个字符`);
    return title;
}

async function parseDraftTitle(form: RequestFormData): Promise<string | Response> {
    const title = form.get("title")?.toString().trim() ?? "";
    if (title.length > MAX_TITLE_LENGTH) return jsonError(400, `作品标题不能超过 ${MAX_TITLE_LENGTH} 个字符`);
    return title;
}

function parseDescription(form: RequestFormData): { description: string } | Response {
    const description = form.get("description")?.toString().trim() ?? "";
    if (description.length > MAX_DESCRIPTION_LENGTH) {
        return jsonError(400, `作品简介不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`);
    }
    return { description };
}

function collectFiles(form: RequestFormData): { files: File[] } | Response {
    const files: File[] = [];
    for (const entry of form.getAll("files")) {
        if (entry instanceof File) files.push(entry);
    }
    if (files.length > MAX_WORK_FILES) return jsonError(400, `最多上传 ${MAX_WORK_FILES} 个文件`);
    return { files };
}

async function copyWorkFiles(
    files: { name: string; path: string; size: number }[],
): Promise<{ rows: { name: string; path: string; size: number }[]; error?: string }> {
    const rows: { name: string; path: string; size: number }[] = [];
    for (const file of files) {
        const data = Bun.file(file.path.replace(/^\//, ""));
        if (!(await data.exists())) continue;
        const bytes = new Uint8Array(await data.arrayBuffer());
        if (bytes.length > MAX_WORK_FILE_SIZE) {
            return { rows: [], error: `单个文件不能超过 ${MAX_WORK_FILE_SIZE / 1024 / 1024}MB` };
        }
        const base = crypto.randomUUID();
        const ext = fileExtension(file.name);
        const relPath = `${base}.${ext}`;
        await Bun.write(`./uploads/${relPath}`, bytes);
        rows.push({ name: file.name, path: `/uploads/${relPath}`, size: file.size });
    }
    return { rows };
}

async function processCover(file: File): Promise<{ path: string } | { error: string }> {
    if (!ALLOWED_COVER_TYPES.has(file.type)) {
        return { error: "封面仅支持 png、jpg、webp、gif 格式" };
    }
    if (file.size > MAX_COVER_SIZE) {
        return { error: "封面大小不能超过 2MB" };
    }
    if (file.type === "image/gif") {
        const base = crypto.randomUUID();
        const relPath = `${base}.gif`;
        await Bun.write(`./uploads/${relPath}`, file);
        return { path: `/uploads/${relPath}` };
    }
    try {
        const bytes = await new Bun.Image(file)
            .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "fill" })
            .webp({ quality: COVER_WEBP_QUALITY })
            .bytes();
        const base = crypto.randomUUID();
        const relPath = `${base}.webp`;
        await Bun.write(`./uploads/${relPath}`, bytes);
        return { path: `/uploads/${relPath}` };
    } catch {
        return { error: "封面处理失败，请更换图片后重试" };
    }
}

async function copyCover(coverPath: string): Promise<string> {
    if (!coverPath) return "";
    try {
        const data = Bun.file(coverPath.replace(/^\//, ""));
        if (!(await data.exists())) return "";
        const bytes = await data.arrayBuffer();
        const base = crypto.randomUUID();
        const dot = coverPath.lastIndexOf(".");
        const ext = dot > 1 && coverPath.length - dot - 1 <= 8 ? coverPath.slice(dot + 1) : "webp";
        const relPath = `${base}.${ext}`;
        await Bun.write(`./uploads/${relPath}`, bytes);
        return `/uploads/${relPath}`;
    } catch {
        return "";
    }
}

function coverField(form: RequestFormData): File | null {
    const entry = form.get("cover");
    return entry instanceof File && entry.size > 0 ? entry : null;
}

export const routes: Bun.Serve.Routes<any, any> = {
    "/api/works": {
        GET: async (req) => {
            const me = await getAuthUser(req);
            const url = new URL(req.url);
            const { offset, limit } = parsePagination(url);
            const sort = url.searchParams.get("sort") === "hot" ? "hot" : "latest";
            const authorIdRaw = url.searchParams.get("author_id")?.trim() ?? "";
            const authorId = authorIdRaw ? Number(authorIdRaw) || null : null;
            if (authorId != null && !userExists(authorId)) return jsonError(404, "用户不存在");
            const works = listWorks({
                offset,
                limit,
                sort,
                authorId,
                viewerId: me?.id ?? null,
            });
            return Response.json(works);
        },
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");

            const form = await req.formData();
            const title = await parseNonEmptyTitle(form);
            if (title instanceof Response) return title;
            const description = parseDescription(form);
            if (description instanceof Response) return description;
            const filesResult = collectFiles(form);
            if (filesResult instanceof Response) return filesResult;

            const coverFile = coverField(form);
            if (!coverFile) return jsonError(400, "作品封面不能为空");
            const coverResult = await processCover(coverFile);
            if ("error" in coverResult) return jsonError(400, coverResult.error);

            const saved = await saveWorkFiles(filesResult.files);
            if (saved.error) return jsonError(400, saved.error);
            const work = createWork(me.id, title, description.description, coverResult.path, null, saved.rows);
            if (!work) return jsonError(500, "创建作品失败");
            return Response.json(work, { status: 201 });
        },
    },

    "/api/works/:id": {
        GET: async (req) => {
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const me = await getAuthUser(req);
            const work = getWorkById(parsed, me?.id ?? null);
            if (!work) return jsonError(404, "作品不存在");
            return Response.json(work);
        },
        PATCH: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getWorkOwner(parsed);
            if (ownerId === null) return jsonError(404, "作品不存在");
            if (ownerId !== me.id) return jsonError(403, "无权修改该作品");

            const form = await req.formData();
            const title = await parseNonEmptyTitle(form);
            if (title instanceof Response) return title;
            const description = parseDescription(form);
            if (description instanceof Response) return description;
            const filesResult = collectFiles(form);
            if (filesResult instanceof Response) return filesResult;

            let cover = "";
            const coverFile = coverField(form);
            if (coverFile) {
                const coverResult = await processCover(coverFile);
                if ("error" in coverResult) return jsonError(400, coverResult.error);
                cover = coverResult.path;
            } else {
                cover = getWorkById(parsed, null)?.cover ?? "";
            }

            const saved = await saveWorkFiles(filesResult.files);
            if (saved.error) return jsonError(400, saved.error);
            const updated = updateWork(parsed, title, description.description, cover, saved.rows);
            await deleteFilePaths(updated.removedFiles);
            if (updated.removedCover) await unlink(updated.removedCover.replace(/^\//, "")).catch(() => {});
            if (!updated.work) return jsonError(500, "更新作品失败");
            return Response.json(updated.work);
        },
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getWorkOwner(parsed);
            if (ownerId === null) return jsonError(404, "作品不存在");
            if (ownerId !== me.id) return jsonError(403, "无权删除该作品");
            const { filePaths, coverPath } = deleteWork(parsed);
            for (const path of filePaths) await unlink(path.replace(/^\//, "")).catch(() => {});
            if (coverPath) await unlink(coverPath.replace(/^\//, "")).catch(() => {});
            return Response.json({ success: true });
        },
    },

    "/api/works/:id/fork": {
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const source = getWorkById(parsed, null);
            if (!source) return jsonError(404, "作品不存在");

            const saved = await copyWorkFiles(source.files);
            if (saved.error) return jsonError(400, saved.error);

            let cover = source.cover;
            const contentType = req.headers.get("content-type") ?? "";
            if (contentType.startsWith("multipart/form-data")) {
                const form = await req.formData();
                const coverFile = coverField(form);
                if (coverFile) {
                    const coverResult = await processCover(coverFile);
                    if ("error" in coverResult) return jsonError(400, coverResult.error);
                    cover = coverResult.path;
                } else {
                    cover = await copyCover(source.cover);
                }
            } else {
                cover = await copyCover(source.cover);
            }

            const work = createWork(me.id, source.title, source.description, cover, source.id, saved.rows);
            if (!work) return jsonError(500, "派生失败");
            return Response.json(work, { status: 201 });
        },
    },

    "/api/works/:id/forks": {
        GET: async (req) => {
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getWorkOwner(parsed) === null) return jsonError(404, "作品不存在");
            const me = await getAuthUser(req);
            const { offset, limit } = parsePagination(new URL(req.url), 20, 50);
            return Response.json(listForks(parsed, { offset, limit, viewerId: me?.id ?? null }));
        },
    },

    "/api/works/:id/like": {
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getWorkOwner(parsed) === null) return jsonError(404, "作品不存在");
            return Response.json(toggleWorkLike(me.id, parsed));
        },
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getWorkOwner(parsed) === null) return jsonError(404, "作品不存在");
            return Response.json(unlikeWork(me.id, parsed));
        },
    },

    "/api/works/:id/favorite": {
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getWorkOwner(parsed) === null) return jsonError(404, "作品不存在");
            return Response.json(toggleWorkFavorite(me.id, parsed));
        },
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getWorkOwner(parsed) === null) return jsonError(404, "作品不存在");
            return Response.json(unfavoriteWork(me.id, parsed));
        },
    },

    "/api/works/:id/comments": {
        GET: async (req) => {
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getWorkOwner(parsed) === null) return jsonError(404, "作品不存在");
            const { offset, limit } = parsePagination(new URL(req.url), 20, 50);
            const viewer = await getAuthUser(req);
            return Response.json(listWorkComments(parsed, viewer?.id ?? null, { offset, limit }));
        },
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getWorkOwner(parsed) === null) return jsonError(404, "作品不存在");
            const body = (await req.json().catch(() => null)) as { content?: string; parent_id?: number | null } | null;
            const content = body?.content?.trim() ?? "";
            if (!content) return jsonError(400, "评论内容不能为空");
            if (content.length > MAX_COMMENT_LENGTH) return jsonError(400, `评论不能超过 ${MAX_COMMENT_LENGTH} 字`);
            const parentId = body?.parent_id ?? null;
            if (parentId != null && !workCommentBelongsToWork(parentId, parsed))
                return jsonError(400, "回复目标不在该作品下");
            const comment = createWorkComment(me.id, parsed, content, parentId);
            if (comment) {
                try {
                    if (parentId != null) {
                        const targetOwner = getWorkCommentOwner(parentId);
                        if (targetOwner != null && targetOwner !== me.id) {
                            createNotification({
                                userId: targetOwner,
                                actorId: me.id,
                                type: "work_reply",
                                workId: parsed,
                                commentId: comment.id,
                            });
                        }
                    } else {
                        const workOwner = getWorkOwner(parsed);
                        if (workOwner != null && workOwner !== me.id) {
                            createNotification({
                                userId: workOwner,
                                actorId: me.id,
                                type: "work_comment",
                                workId: parsed,
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

    "/api/works/comments/:id/like": {
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getWorkCommentOwner(parsed) === null) return jsonError(404, "评论不存在");
            return Response.json(toggleWorkCommentLike(me.id, parsed));
        },
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if (getWorkCommentOwner(parsed) === null) return jsonError(404, "评论不存在");
            return Response.json(unlikeWorkComment(me.id, parsed));
        },
    },

    "/api/works/comments/:id": {
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getWorkCommentOwner(parsed);
            if (ownerId === null) return jsonError(404, "评论不存在");
            if (ownerId !== me.id) return jsonError(403, "无权删除该评论");
            deleteWorkComment(parsed);
            return Response.json({ success: true });
        },
    },

    "/api/work-drafts": {
        GET: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const url = new URL(req.url);
            const { offset, limit } = parsePagination(url);
            const status = url.searchParams.get("status") as "draft" | "published" | null;
            const parsed = status === "draft" || status === "published" ? status : undefined;
            return Response.json(listWorkDrafts(me.id, { offset, limit, status: parsed }));
        },
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const form = await req.formData();
            const title = await parseDraftTitle(form);
            if (title instanceof Response) return title;
            const description = parseDescription(form);
            if (description instanceof Response) return description;
            const filesResult = collectFiles(form);
            if (filesResult instanceof Response) return filesResult;
            const saved = await saveWorkFiles(filesResult.files);
            if (saved.error) return jsonError(400, saved.error);
            let cover = "";
            const coverFile = coverField(form);
            if (coverFile) {
                const coverResult = await processCover(coverFile);
                if ("error" in coverResult) return jsonError(400, coverResult.error);
                cover = coverResult.path;
            }
            const draft = createWorkDraft(me.id, {
                title,
                description: description.description,
                cover,
                fileRows: saved.rows,
            });
            return Response.json(draft, { status: 201 });
        },
    },

    "/api/work-drafts/:id": {
        GET: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getWorkDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权查看该草稿");
            return Response.json(getWorkDraftById(parsed));
        },
        PATCH: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getWorkDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权修改该草稿");
            const existing = getWorkDraftById(parsed);
            if (!existing) return jsonError(404, "草稿不存在");
            if (existing.status === "published") return jsonError(400, "已发布的草稿请先取消发布再编辑");

            const form = await req.formData();
            const title = await parseDraftTitle(form);
            if (title instanceof Response) return title;
            const description = parseDescription(form);
            if (description instanceof Response) return description;
            const filesResult = collectFiles(form);
            if (filesResult instanceof Response) return filesResult;
            let fileRows: { name: string; path: string; size: number }[];
            if (filesResult.files.length > 0) {
                const saved = await saveWorkFiles(filesResult.files);
                if (saved.error) return jsonError(400, saved.error);
                fileRows = saved.rows;
            } else {
                fileRows = existing.files.map((f) => ({
                    name: f.name,
                    path: f.path,
                    size: f.size,
                }));
            }

            let cover = existing?.cover ?? "";
            const coverFile = coverField(form);
            if (coverFile) {
                const coverResult = await processCover(coverFile);
                if ("error" in coverResult) return jsonError(400, coverResult.error);
                cover = coverResult.path;
            }

            const { draft, removedFiles, removedCover } = updateWorkDraft(parsed, {
                title,
                description: description.description,
                cover,
                fileRows,
            });
            await deleteFilePaths(removedFiles);
            if (removedCover) await unlink(removedCover.replace(/^\//, "")).catch(() => {});
            if (!draft) return jsonError(500, "更新草稿失败");
            return Response.json(draft);
        },
        DELETE: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getWorkDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权删除该草稿");
            const { filePaths, coverPath } = deleteWorkDraft(parsed);
            await deleteFilePaths(filePaths);
            if (coverPath) await unlink(coverPath.replace(/^\//, "")).catch(() => {});
            return Response.json({ success: true });
        },
    },

    "/api/work-drafts/:id/publish": {
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getWorkDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权发布该草稿");
            const draft = getWorkDraftById(parsed);
            if (!draft) return jsonError(404, "草稿不存在");
            if (draft.status === "published") return jsonError(400, "草稿已发布，请勿重复发布");
            if (!draft.title) return jsonError(400, "发布标题不能为空");
            if (!draft.cover) return jsonError(400, "发布封面不能为空");
            const result = publishWorkDraft(parsed);
            if (!result) return jsonError(500, "发布失败");
            return Response.json(result.work, { status: 201 });
        },
    },

    "/api/work-drafts/:id/unpublish": {
        POST: async (req) => {
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            const ownerId = getWorkDraftOwner(parsed);
            if (ownerId === null) return jsonError(404, "草稿不存在");
            if (ownerId !== me.id) return jsonError(403, "无权取消发布该草稿");
            const draft = getWorkDraftById(parsed);
            if (!draft) return jsonError(404, "草稿不存在");
            if (draft.status !== "published") return jsonError(400, "该草稿尚未发布");
            const updated = unpublishWorkDraft(parsed);
            if (!updated) return jsonError(500, "取消发布失败");
            return Response.json(updated);
        },
    },
};
