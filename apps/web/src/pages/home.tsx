import type { UserPublic } from "@/lib/api.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";

export function Home({ user, onLogout }: { user: UserPublic; onLogout: () => void }) {
    console.log(user);
    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-xl">已登录</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 justify-items-center">
                <Avatar size={"lg"}>
                    <AvatarImage src={user.avatar} alt={user.username} />
                    <AvatarFallback>{user.username.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1 text-center">
                    <p className="text-base font-medium">{user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Button size="lg" className="w-full" onClick={onLogout}>
                    退出登录
                </Button>
            </CardContent>
        </Card>
    );
}
