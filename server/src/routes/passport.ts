import { getStorage, toPublicUser } from "../storage";
import { signToken } from "../jwt";
import { jsonError, getAuthUser } from "./util";
import { saveAvatar } from "./avatar";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const routes: Bun.Serve.Routes<any, any> = {
    "/api/passport/register": async (req) => {
        const storage = getStorage();
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
        if (await storage.users.findUserByEmail(email)) {
            return jsonError(409, "该邮箱已被注册");
        }
        if (await storage.users.findUserByUsername(username)) {
            return jsonError(409, "该用户名已被使用");
        }

        let avatar: string | null = null;
        const avatarFile = form.get("avatar");
        if (avatarFile instanceof File && avatarFile.size > 0) {
            const saved = await saveAvatar(avatarFile);
            if ("error" in saved) return saved.error;
            avatar = saved.path;
        }

        const passwordHash = await Bun.password.hash(password, {
            algorithm: "argon2id",
            memoryCost: 65536,
            timeCost: 3,
        });
        const user = await storage.users.createUser(username, email, passwordHash, avatar);
        return Response.json(user, { status: 201 });
    },

    "/api/passport/login": async (req) => {
        const storage = getStorage();
        const body = (await req.json().catch(() => null)) as { login?: string; password?: string } | null;
        const login = body?.login?.trim() ?? "";
        const password = body?.password ?? "";

        if (!login || !password) {
            return jsonError(400, "用户名和密码均为必填项");
        }

        const user = await storage.users.findUserByUsernameOrEmail(login);
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
        const user = await getAuthUser(req);
        if (!user) {
            return jsonError(401, "未提供有效登录凭证");
        }
        return Response.json(user);
    },
};
