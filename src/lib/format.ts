// 服务端时间形如 "YYYY-MM-DD HH:mm:ss"（无时区前缀），约定按 UTC 解析：
// 补一个 T 和 Z，统一转成 Date 后再本地化展示，保证各时区显示一致。
function parseServerDate(value: string): Date {
    return new Date(value.includes(" ") ? `${value.replace(" ", "T")}Z` : value);
}

export function formatDate(value: string): string {
    const date = parseServerDate(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("zh-CN");
}

export function formatDateTime(value: string): string {
    const date = parseServerDate(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}

export function formatRelativeTime(value: string): string {
    const date = parseServerDate(value);
    if (Number.isNaN(date.getTime())) return value;
    const diff = Date.now() - date.getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return "刚刚";
    if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
    if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
    if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
    return date.toLocaleDateString("zh-CN");
}
