export function formatDate(value: string): string {
    const date = new Date(value.includes(" ") ? `${value.replace(" ", "T")}Z` : value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("zh-CN");
}

export function formatDateTime(value: string): string {
    const date = new Date(value.includes(" ") ? `${value.replace(" ", "T")}Z` : value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}
