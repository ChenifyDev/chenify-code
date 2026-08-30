import type { AppNotification } from "@/lib/api";
import { parseFrontmatter } from "@/lib/frontmatter.ts";

export function notificationLink(notification: AppNotification): { to: string; text: string } | null {
    const to = notification.post_id
        ? `/posts/${notification.post_id}`
        : notification.work_id
          ? `/works/${notification.work_id}`
          : null;
    if (!to) return null;
    const snippet = (text: string) => parseFrontmatter(text).body || "查看详情";
    if (notification.type === "post_reply" || notification.type === "work_reply") {
        return { to, text: notification.reply_to ? snippet(notification.reply_to) : snippet(notification.snippet) };
    }
    return { to, text: snippet(notification.snippet) };
}