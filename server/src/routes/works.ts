import { getStorage } from "../storage";
import { getAuthUser, jsonError } from "./util";

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_COMMENT_LENGTH = 5000;

const ALLOWED_COVER_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_COVER_SIZE = 2 * 1024 * 1024;
const COVER_WIDTH = 1280;
const COVER_HEIGHT = 853;
const COVER_WEBP_QUALITY = 80;

function numericIdError(raw: string): number | Response {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return jsonError(400, "无效的 ID");
    return id;
}

async function processCover(file: File): Promise<{ path: string } | { error: string }> {
    const blocks = getStorage().blobs;
    if (!ALLOWED_COVER_TYPES.has(file.type)) {
        return { error: "封面仅支持 png、jpg、webp、gif 格式" };
    }
    if (file.size > MAX_COVER_SIZE) {
        return { error: "封面大小不能超过 2MB" };
    }
    if (file.type === "image/gif") {
        const relPath = `${crypto.randomUUID()}.gif`;
        return { path: await blocks.put(file, relPath) };
    }
    try {
        const bytes = await new Bun.Image(file)
            .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "fill" })
            .webp({ quality: COVER_WEBP_QUALITY })
            .bytes();
        const relPath = `${crypto.randomUUID()}.webp`;
        return { path: await blocks.put(bytes, relPath) };
    } catch {
        return { error: "封面处理失败，请更换图片后重试" };
    }
}

export const routes: Bun.Serve.Routes<any, any> = {
    "/api/works": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");

            const form = await req.formData();
            const title = form.get("title")?.toString().trim() ?? "";
            if (!title) return jsonError(400, "作品标题不能为空");
            if (title.length > MAX_TITLE_LENGTH) return jsonError(400, `作品标题不能超过 ${MAX_TITLE_LENGTH} 个字符`);

            const description = form.get("description")?.toString().trim() ?? "";
            if (description.length > MAX_DESCRIPTION_LENGTH) {
                return jsonError(400, `作品简介不能超过 ${MAX_DESCRIPTION_LENGTH} 个字符`);
            }

            const gitPath = form.get("git_path")?.toString().trim() ?? "";

            const coverEntry = form.get("cover");
            const coverFile = coverEntry instanceof File && coverEntry.size > 0 ? coverEntry : null;
            if (!coverFile) return jsonError(400, "作品封面不能为空");
            const coverResult = await processCover(coverFile);
            if ("error" in coverResult) return jsonError(400, coverResult.error);

            const work = await storage.works.createWork(me.id, {
                title,
                description,
                cover: coverResult.path,
                git_path: gitPath,
            });
            if (!work) return jsonError(500, "发布作品失败");
            return Response.json(work, { status: 201 });
        },
    },

    "/api/works/:id/like": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.works.getWorkOwner(parsed)) === null) return jsonError(404, "作品不存在");
            return Response.json(await storage.works.toggleWorkLike(me.id, parsed));
        },
        DELETE: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.works.getWorkOwner(parsed)) === null) return jsonError(404, "作品不存在");
            return Response.json(await storage.works.unlikeWork(me.id, parsed));
        },
    },

    "/api/works/:id/comments": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.works.getWorkOwner(parsed)) === null) return jsonError(404, "作品不存在");

            const body = (await req.json().catch(() => null)) as { content?: string; parent_id?: number | null } | null;
            const content = body?.content?.trim() ?? "";
            if (!content) return jsonError(400, "评论内容不能为空");
            if (content.length > MAX_COMMENT_LENGTH) return jsonError(400, `评论不能超过 ${MAX_COMMENT_LENGTH} 字`);
            const parentId = body?.parent_id ?? null;
            if (parentId != null && !(await storage.worksComments.workCommentBelongsToWork(parentId, parsed)))
                return jsonError(400, "回复目标不在该作品下");

            const comment = await storage.worksComments.createWorkComment(me.id, parsed, content, parentId);
            if (!comment) return jsonError(500, "评论失败");
            return Response.json(comment, { status: 201 });
        },
    },

    "/api/works/comments/:id/like": {
        POST: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.worksComments.getWorkCommentOwner(parsed)) === null) return jsonError(404, "评论不存在");
            return Response.json(await storage.worksComments.toggleWorkCommentLike(me.id, parsed));
        },
        DELETE: async (req) => {
            const storage = getStorage();
            const me = await getAuthUser(req);
            if (!me) return jsonError(401, "请先登录");
            const parsed = numericIdError((req.params as any).id ?? "");
            if (parsed instanceof Response) return parsed;
            if ((await storage.worksComments.getWorkCommentOwner(parsed)) === null) return jsonError(404, "评论不存在");
            return Response.json(await storage.worksComments.unlikeWorkComment(me.id, parsed));
        },
    },
};
