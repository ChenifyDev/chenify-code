import { type ChangeEvent, useState, type SubmitEventHandler } from "react";
import { ImagePlus, Loader2, Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { updateProfile } from "@/lib/api";
import { useUserStore } from "@/stores/useUser.ts";
import { useAvatarUpload } from "@/hooks/useAvatarUpload.ts";
import { type FormStatus, StatusMessage } from "@/components/StatusMessage.tsx";

export default function SettingsPage() {
    const { user, checking, setUser } = useUserStore();
    const navigate = useNavigate();

    const [username, setUsername] = useState(user?.username ?? "");
    // removeAvatar 标记"移除为默认头像"：它与"新选文件预览"互斥，
    // 提交时 avatar=undefined + removeAvatar=true 表示还原默认。
    const [removeAvatar, setRemoveAvatar] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<FormStatus>(null);
    const { file, preview, handleChange, handleRemove } = useAvatarUpload({
        onError: (message) => setStatus({ type: "error", text: message }),
    });

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        setStatus(null);
        handleChange(event);
        if (event.target.files?.[0]) setRemoveAvatar(false);
    };

    const handleRemoveAvatar = () => {
        handleRemove();
        setRemoveAvatar(true);
    };

    if (checking) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (!user) {
        navigate("/login");
        return null;
    }

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (submitting) return;
        setStatus(null);

        const trimmed = username.trim();
        if (trimmed.length < 2 || trimmed.length > 32) {
            setStatus({ type: "error", text: "用户名长度需在 2-32 个字符之间" });
            return;
        }

        setSubmitting(true);
        try {
            const updated = await updateProfile({
                username: trimmed,
                avatar: file ?? undefined,
                removeAvatar,
            });
            setUser(updated);
            handleRemove();
            setRemoveAvatar(false);
            setStatus({ type: "success", text: "资料已更新" });
        } catch (err) {
            setStatus({ type: "error", text: err instanceof Error ? err.message : "更新失败" });
        } finally {
            setSubmitting(false);
        }
    };

    // 三种展示状态：新选文件预览 > 当前头像 > 移除后的空占位
    const showCurrent = !!user.avatar && !preview && !removeAvatar;

    return (
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
            <header className="mb-4">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <Settings className="size-5" />
                    设置
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">修改你的用户名和头像</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>个人资料</CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="grid gap-4" onSubmit={handleSubmit}>
                        <div className="grid gap-1.5">
                            <Label htmlFor="settings-avatar">头像</Label>
                            <div className="flex items-center gap-3">
                                <Avatar className="size-16">
                                    {preview ? (
                                        <AvatarImage src={preview} alt="头像预览" />
                                    ) : showCurrent ? (
                                        <AvatarImage src={user.avatar!} alt="当前头像" />
                                    ) : null}
                                    <AvatarFallback className="text-xl text-muted-foreground">
                                        <ImagePlus className="size-6" />
                                    </AvatarFallback>
                                </Avatar>
                                <Input
                                    id="settings-avatar"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    className="flex-1 file:h-full file:cursor-pointer"
                                    onChange={handleAvatarChange}
                                    disabled={submitting}
                                />
                                {user.avatar && !preview && !removeAvatar && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleRemoveAvatar}
                                        aria-label="移除头像"
                                        disabled={submitting}
                                    >
                                        <X />
                                    </Button>
                                )}
                                {removeAvatar && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setRemoveAvatar(false)}
                                        disabled={submitting}
                                    >
                                        取消移除
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="settings-username">用户名</Label>
                            <Input
                                id="settings-username"
                                autoComplete="username"
                                placeholder="2-32 个字符"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={submitting}
                            />
                        </div>

                        <StatusMessage status={status} />

                        <Button type="submit" className="w-fit" disabled={submitting}>
                            {submitting && <Loader2 className="animate-spin" />}
                            {submitting ? "保存中…" : "保存"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
