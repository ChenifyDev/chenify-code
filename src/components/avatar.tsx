import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";

type UserLike = {
    username: string;
    avatar?: string | null;
};

type UserAvatarProps = {
    user: UserLike | null;
    size?: "default" | "sm" | "lg";
    fallback?: ReactNode;
    fallbackClassName?: string;
    className?: string;
    onClick?: () => void;
    children?: ReactNode;
};

function UserAvatar({ user, size, fallback, fallbackClassName, className, onClick, children }: UserAvatarProps) {
    return (
        <Avatar size={size} className={className} onClick={onClick}>
            {user?.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
            <AvatarFallback className={fallbackClassName}>{user ? user.username.slice(0, 2) : fallback}</AvatarFallback>
            {children}
        </Avatar>
    );
}

export { UserAvatar };
