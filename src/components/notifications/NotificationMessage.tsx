import { Link } from "react-router-dom";

import type { AppNotification } from "@/lib/api";

export function NotificationMessage({ notification }: { notification: AppNotification }) {
    const name = notification.actor.username;

    const tipAmount = (): number => {
        if (!notification.data) return notification.type === "post_tip" ? 0.1 : 0;
        try {
            const parsed = JSON.parse(notification.data) as { amount?: number };
            return typeof parsed.amount === "number" ? parsed.amount : 0;
        } catch {
            // 忽略无效的 data
            return 0;
        }
    };

    switch (notification.type) {
        case "post_comment":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    评论了你的帖子
                </span>
            );
        case "work_comment":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    评论了你的作品
                </span>
            );
        case "post_reply":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    回复了你的评论
                </span>
            );
        case "work_reply":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    回复了你的评论
                </span>
            );
        case "post_tip":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    给你投了 {tipAmount()} 枚硬币
                </span>
            );
        case "user_tip":
            return (
                <span>
                    <Link to={`/users/${notification.actor.id}`}>
                        <span className="font-medium">{name}</span>
                    </Link>{" "}
                    给你投了 {tipAmount()} 枚硬币
                </span>
            );
    }
}