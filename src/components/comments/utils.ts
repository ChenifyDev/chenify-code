type BaseComment<T> = {
    id: number;
    parent_id: number | null;
    replies: T[];
};

function insertReply<T extends BaseComment<T>>(list: T[], reply: T): T[] {
    const addChild = (item: T): T => {
        if (item.id === reply.parent_id) {
            return {
                ...item,
                replies: [...item.replies, reply],
            };
        }
        return {
            ...item,
            replies: item.replies.map(addChild),
        };
    };

    return list.map(addChild);
}

function updateComment<T extends BaseComment<T>>(list: T[], commentId: number, updater: (c: T) => T): T[] {
    const traverse = (item: T): T => {
        if (item.id === commentId) {
            return updater(item);
        }
        return {
            ...item,
            replies: item.replies.map(traverse),
        };
    };
    return list.map(traverse);
}

export { insertReply, updateComment };
