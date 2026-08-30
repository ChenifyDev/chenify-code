import { useCallback, useEffect, useState } from "react";

const KEYS = {
    content: "tmp_content",
    title: "tmp_title",
    commentArea: "tmp_comment_area",
    tag: "tmp_tag",
};

/**
 * 写帖页的草稿自动保存：把内容/标题/评论开关/标签防抖（800ms）写入 localStorage，
 * 页面刷新后可恢复。clear() 在草稿保存或发布成功后清空临时缓存。
 *
 * localStorage 只能存字符串，故布尔值 commentArea 序列化为 "1"/"false"，
 * 读取时用 `!== "false"` 反解（旧数据缺失时默认为 true/允许评论）。
 */
export function useDraftPersistence() {
    const [content, setContent] = useState(() => localStorage.getItem(KEYS.content) || "");
    const [title, setTitle] = useState(() => localStorage.getItem(KEYS.title) || "");
    const [commentArea, setCommentArea] = useState(() => localStorage.getItem(KEYS.commentArea) !== "false");
    const [tagInput, setTagInput] = useState(() => localStorage.getItem(KEYS.tag) || "");

    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem(KEYS.content, content);
            localStorage.setItem(KEYS.title, title);
            localStorage.setItem(KEYS.commentArea, commentArea ? "1" : "false");
            localStorage.setItem(KEYS.tag, tagInput);
        }, 800);
        return () => clearTimeout(timer);
    }, [content, title, tagInput, commentArea]);

    const clear = useCallback(() => {
        localStorage.removeItem(KEYS.content);
        localStorage.removeItem(KEYS.title);
        localStorage.removeItem(KEYS.commentArea);
        localStorage.removeItem(KEYS.tag);
    }, []);

    return { content, setContent, title, setTitle, commentArea, setCommentArea, tagInput, setTagInput, clear };
}