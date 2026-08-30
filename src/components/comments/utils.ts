type BaseComment<T> = {
    id: number;
    parent_id: number | null;
    replies: T[];
};

// 评论是"一级 + 每条的 replies"两层的嵌套结构，下面两个工具都用不可变方式递归处理，
// 在克隆沿途祖先节点的同时定位目标节点，从而安全地用 setState 更新。

/** 把一条回复插入到对应 parent 的 replies 末尾（插入失败时原样返回原列表）。 */
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

/** 递归定位 commentId（任意层级）并应用 updater，返回新的不可变列表。 */
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
