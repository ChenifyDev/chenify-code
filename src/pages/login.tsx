import React, { type ChangeEventHandler, type SubmitEventHandler, useCallback, useMemo, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { login, register, setToken, type UserPublic } from "@/lib/api";
import { useUserStore } from "@/stores/useUser.ts";
import { useCoinsStore } from "@/stores/useCoins.ts";
import { useNavigate, useSearchParams } from "react-router-dom";

type Status = { type: "error" | "success"; text: string } | null;

function getSafeReturnTo(raw: string | null): string | null {
    if (!raw) return null;
    try {
        const url = new URL(raw, window.location.href);
        const apiBase = (import.meta.env.VITE_API_PATH as string | undefined) ?? "";
        const allowedOrigins = new Set<string>([window.location.origin]);
        if (apiBase) {
            try {
                allowedOrigins.add(new URL(apiBase).origin);
            } catch {
                // ignore invalid VITE_API_PATH
            }
        }
        if (!allowedOrigins.has(url.origin)) return null;
        if (url.pathname !== "/oauth/authorize") return null;
        return url.toString();
    } catch {
        return null;
    }
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
        </div>
    );
}

function StatusMessage({ status }: { status: Status }) {
    if (!status) return null;
    const tone =
        status.type === "error"
            ? "text-destructive bg-destructive/10 dark:bg-destructive/20"
            : "text-foreground bg-muted";
    return (
        <div className={`rounded-md px-3 py-2 text-sm ${tone}`} role={status.type === "error" ? "alert" : "status"}>
            {status.text}
        </div>
    );
}

function LoginForm({ returnTo, onSuccess }: { returnTo: string | null; onSuccess: (user: UserPublic) => void }) {
    const [loginName, setLoginName] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<Status>(null);
    const navigate = useNavigate();

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (submitting) return;
        setStatus(null);

        if (!loginName.trim() || !password) {
            setStatus({ type: "error", text: "请输入用户名和密码" });
            return;
        }

        setSubmitting(true);
        try {
            const { token, user } = await login(loginName.trim(), password);
            setToken(token, remember);
            setStatus({ type: "success", text: `欢迎回来，${user.username}` });
            void useCoinsStore.getState().fetchBalance();
            onSuccess(user);
            if (returnTo) {
                window.location.href = returnTo;
            } else {
                navigate("/");
            }
        } catch (err) {
            setStatus({ type: "error", text: err instanceof Error ? err.message : "登录失败" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="grid gap-4" onSubmit={handleSubmit}>
            <Field id="login-name" label="用户名">
                <Input
                    id="login-name"
                    autoComplete="username"
                    placeholder="用户名或邮箱"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    disabled={submitting}
                />
            </Field>

            <Field id="login-password" label="密码">
                <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                />
            </Field>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                    checked={remember}
                    onCheckedChange={(checked) => setRemember(checked)}
                    disabled={submitting}
                />
                记住我（7 天内免登录）
            </label>

            <StatusMessage status={status} />

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                {submitting ? "登录中…" : "登录"}
            </Button>
        </form>
    );
}

function RegisterForm({
    defaultUsername,
    onRegistered,
}: {
    defaultUsername: string;
    onRegistered: (username: string) => void;
}) {
    const [username, setUsername] = useState(defaultUsername);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<Status>(null);

    const handleAvatarChange: ChangeEventHandler<HTMLInputElement> = (event) => {
        const file = event.target.files?.[0] ?? null;
        setStatus(null);
        if (!file) return;
        if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
            setStatus({ type: "error", text: "头像仅支持 png、jpg、webp、gif 格式" });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setStatus({ type: "error", text: "头像大小不能超过 2MB" });
            return;
        }
        setAvatar(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleRemoveAvatar = () => {
        setAvatar(null);
        setAvatarPreview(null);
    };

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (submitting) return;
        setStatus(null);

        if (username.trim().length < 2 || username.trim().length > 32) {
            setStatus({ type: "error", text: "用户名长度需在 2-32 个字符之间" });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setStatus({ type: "error", text: "邮箱格式不正确" });
            return;
        }
        if (password.length < 6) {
            setStatus({ type: "error", text: "密码长度至少为 6 位" });
            return;
        }
        if (password !== confirm) {
            setStatus({ type: "error", text: "两次输入的密码不一致" });
            return;
        }

        setSubmitting(true);
        try {
            await register(username.trim(), email.trim(), password, avatar);
            setStatus({ type: "success", text: "注册成功，请登录" });
            onRegistered(username.trim());
        } catch (err) {
            setStatus({ type: "error", text: err instanceof Error ? err.message : "注册失败" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="grid gap-4" onSubmit={handleSubmit}>
            <Field id="register-avatar" label="头像（可选，也可稍后上传）">
                <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="头像预览" className="size-full object-cover" />
                        ) : (
                            <ImagePlus className="size-5 text-muted-foreground" />
                        )}
                    </div>
                    <Input
                        id="register-avatar"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="flex-1 file:h-full file:cursor-pointer"
                        onChange={handleAvatarChange}
                        disabled={submitting}
                    />
                    {avatar && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleRemoveAvatar}
                            aria-label="移除头像"
                        >
                            <X />
                        </Button>
                    )}
                </div>
            </Field>

            <Field id="register-username" label="用户名">
                <Input
                    id="register-username"
                    autoComplete="username"
                    placeholder="2-32 个字符"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={submitting}
                />
            </Field>

            <Field id="register-email" label="邮箱">
                <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                />
            </Field>

            <Field id="register-password" label="密码">
                <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="至少 6 位"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                />
            </Field>

            <Field id="register-confirm" label="确认密码">
                <Input
                    id="register-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="再次输入密码"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={submitting}
                />
            </Field>

            <StatusMessage status={status} />

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                {submitting ? "注册中…" : "注册"}
            </Button>
        </form>
    );
}

export default function Login() {
    const [tab, setTab] = useState<string>("login");
    const [defaultUsername, setDefaultUsername] = useState("");
    const { setUser } = useUserStore();
    const [searchParams] = useSearchParams();
    const returnTo = useMemo(() => getSafeReturnTo(searchParams.get("return_to")), [searchParams]);

    const handleRegistered = useCallback((username: string) => {
        setDefaultUsername(username);
        setTab("login");
    }, []);

    return (
        <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">chenify</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={tab} onValueChange={setTab} className="w-full">
                        <TabsList className="w-full">
                            <TabsTrigger value="login" className="flex-1">
                                登录
                            </TabsTrigger>
                            <TabsTrigger value="register" className="flex-1">
                                注册
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="login" className="pt-4">
                            <LoginForm returnTo={returnTo} onSuccess={setUser} />
                        </TabsContent>
                        <TabsContent value="register" className="pt-4">
                            <RegisterForm defaultUsername={defaultUsername} onRegistered={handleRegistered} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
