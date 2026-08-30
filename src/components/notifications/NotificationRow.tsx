import { Link } from "react-router-dom";

import { UserAvatar } from "@/components/avatar.tsx";
import { NotificationMessage } from "@/components/notifications/NotificationMessage.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { AvatarBadge2 } from "@/components/ui/avatar.tsx";
import type { AppNotification } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";

type NotificationRowProps = {
    notification: AppNotification;
    read: boolean;
    link: { to: string; text: string } | null;
    onOpen: (notification: AppNotification) => void;
};

export function NotificationRow({ notification, read, link, onOpen }: NotificationRowProps) {
    return (
        <Card className={cn(!read && "border-primary/40 bg-primary/5")}>
            <CardContent
                role="button"
                tabIndex={0}
                className={cn("flex items-start gap-3 p-3", !read && "font-medium")}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void onOpen(notification);
                    }
                }}
            >
                <Link to={`/users/${notification.actor.id}`}>
                    <UserAvatar user={notification.actor} className="shrink-0">
                        {!read && <AvatarBadge2 className={"bg-destructive"} />}
                    </UserAvatar>
                </Link>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="truncate">
                            <NotificationMessage notification={notification} />
                        </span>
                        {link && (
                            <Link
                                to={link.to}
                                onClick={() => {
                                    if (!read) void onOpen(notification);
                                }}
                                className="mt-1 block truncate text-sm text-primary hover:underline"
                            >
                                {link.text}
                            </Link>
                        )}
                    </div>

                    {notification.comment && (
                        <p className="mt-1 line-clamp-2 rounded-md bg-muted/60 px-2 py-1.5 text-sm text-foreground">
                            {notification.comment}
                        </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(notification.created_at)}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}