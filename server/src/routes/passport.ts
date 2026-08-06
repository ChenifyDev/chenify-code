import {
    createUser,
    findUserByEmail,
    findUserById,
    findUserByUsername,
    findUserByUsernameOrEmail,
    toPublicUser,
} from "../db";
import { signToken, verifyToken } from "../jwt";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const AVATAR_EXTENSIONS: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
};
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 512;
const AVATAR_WEBP_QUALITY = 80;

async function processAvatar(file: File, originalExt: string): Promise<{ data: Uint8Array | File; ext: string }> {
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

function jsonError(status: number, message: string): Response {
    return Response.json({ message }, { status });
}

function extractBearer(req: Request): string | null {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    return auth.slice(7);
}

export const routes: Bun.Serve.Routes<any, any> = {
    "/api/passport/register": async (req) => {
        const form = await req.formData();
        const username = form.get("username")?.toString().trim() ?? "";
        const email = form.get("email")?.toString().trim().toLowerCase() ?? "";
        const password = form.get("password")?.toString() ?? "";

        if (!username || !email || !password) {
            return jsonError(400, "用户名、密码、邮箱均为必填项");
        }
        if (username.length < 2 || username.length > 32) {
            return jsonError(400, "用户名长度需在 2-32 个字符之间");
        }
        if (password.length < 6) {
            return jsonError(400, "密码长度至少为 6 位");
        }
        if (!EMAIL_REGEX.test(email)) {
            return jsonError(400, "邮箱格式不正确");
        }
        if (findUserByEmail(email)) {
            return jsonError(409, "该邮箱已被注册");
        }
        if (findUserByUsername(username)) {
            return jsonError(409, "该用户名已被使用");
        }

        let avatar: string | null = null;
        const avatarFile = form.get("avatar");
        if (avatarFile instanceof File && avatarFile.size > 0) {
            const type = avatarFile.type;
            if (!ALLOWED_AVATAR_TYPES.has(type)) {
                return jsonError(400, "头像仅支持 png、jpg、webp、gif 格式");
            }
            if (avatarFile.size > MAX_AVATAR_SIZE) {
                return jsonError(400, "头像大小不能超过 2MB");
            }
            const ext = AVATAR_EXTENSIONS[type]!;
            const base = crypto.randomUUID();
            const processed = await processAvatar(avatarFile, ext);
            await Bun.write(`./uploads/${base}.${processed.ext}`, processed.data);
            avatar = `/uploads/${base}.${processed.ext}`;
        }

        const passwordHash = await Bun.password.hash(password, {
            algorithm: "argon2id",
            memoryCost: 65536,
            timeCost: 3,
        });
        const user = createUser(username, email, passwordHash, avatar);
        return Response.json(user, { status: 201 });
    },

    "/api/passport/login": async (req) => {
        const body = (await req.json().catch(() => null)) as { login?: string; password?: string } | null;
        const login = body?.login?.trim() ?? "";
        const password = body?.password ?? "";

        if (!login || !password) {
            return jsonError(400, "用户名和密码均为必填项");
        }

        const user = findUserByUsernameOrEmail(login);
        if (!user) {
            return jsonError(401, "用户名或密码错误");
        }
        const valid = await Bun.password.verify(password, user.password_hash);
        if (!valid) {
            return jsonError(401, "用户名或密码错误");
        }

        const token = await signToken({ sub: user.id, username: user.username, email: user.email });
        return Response.json({ token, user: toPublicUser(user) });
    },

    "/api/passport/me": async (req) => {
        const token = extractBearer(req);
        if (!token) {
            return jsonError(401, "未提供登录凭证");
        }
        const payload = await verifyToken(token);
        if (!payload) {
            return jsonError(401, "登录凭证无效或已过期");
        }
        const user = findUserById(payload.sub);
        if (!user) {
            return jsonError(404, "用户不存在");
        }
        return Response.json(user);
    },
};
