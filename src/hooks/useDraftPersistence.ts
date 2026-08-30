import { useCallback, useEffect, useState } from "react";

const KEYS = {
    content: "tmp_content",
    title: "tmp_title",
    commentArea: "tmp_comment_area",
    tag: "tmp_tag",
};

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