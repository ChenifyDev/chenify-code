// 生成调试数据
import { getStorage } from "./src/storage";
import { C } from "./src/storage/collections";
import { deleteContentBlob, loadContentBlob, saveContentBlob } from "./src/storage/content";
import { getOrCreateTag } from "./src/storage/operations/tags-internal";
import type {
    StoredComment,
    StoredCommentLike,
    StoredDraft,
    StoredDraftTag,
    StoredFavorite,
    StoredFollow,
    StoredLike,
    StoredPost,
    StoredPostTag,
    StoredUser,
} from "./src/storage/rows";

const storage = getStorage();
const { store, blobs } = storage;

const PASSWORD = "123456";
const SAMPLE_USERNAMES = ["alice", "bob", "carol", "dave", "erin"];

const reset = process.argv.includes("--reset");

interface SeedPost {
    content: string;
    tags: string[];
    created_at: string;
}

interface SeedDraft {
    content: string;
    tags: string[];
    status: "draft" | "published";
    post_key?: string; // published 草稿用，指向该用户自己的帖子（如 "alice:0"）
    created_at: string;
    updated_at: string;
}

interface SeedUser {
    username: string;
    email: string;
    posts: SeedPost[];
    drafts: SeedDraft[];
    follows: string[];
    favorites: string[]; // list of "<authorUsername>:<postIndex>" to favorite
    likes: string[]; // list of "<authorUsername>:<postIndex>" to like
}

const seedUsers: SeedUser[] = [
    {
        username: "alice",
        email: "alice@example.com",
        posts: [
            {
                content: "终于把博客从 Next.js 迁到了 Vite + React 19，冷启动快得飞起，HMR 也流畅多了。",
                tags: ["react", "vite"],
                created_at: "2026-07-30 10:20:00",
            },
            {
                content: "状态管理还是喜欢 zustand，API 简洁到几乎没有心智负担，配合 React 19 的 use 很舒服。",
                tags: ["zustand", "react"],
                created_at: "2026-07-25 21:05:00",
            },
        ],
        drafts: [
            {
                content: "终于把博客从 Next.js 迁到了 Vite + React 19，冷启动快得飞起，HMR 也流畅多了。",
                tags: ["react", "vite"],
                status: "published",
                post_key: "alice:0",
                created_at: "2026-07-30 10:10:00",
                updated_at: "2026-07-30 10:20:00",
            },
            {
                content: "状态管理还是喜欢 zustand，API 简洁到几乎没有心智负担，配合 React 19 的 use 很舒服。",
                tags: ["zustand", "react"],
                status: "published",
                post_key: "alice:1",
                created_at: "2026-07-25 20:50:00",
                updated_at: "2026-07-25 21:05:00",
            },
            {
                content:
                    "最近在整理一份 React 性能优化清单：useMemo/useCallback 别乱用，子树拆分会更直接。写一半还没想好怎么组织。",
                tags: ["react"],
                status: "draft",
                created_at: "2026-08-04 09:00:00",
                updated_at: "2026-08-05 20:30:00",
            },
            {
                content: "SQL 里 IN 子句传几千个参数是不是很蠢？有没有更优雅的批量查询方案，求老手指点。",
                tags: ["sqlite", "backend"],
                status: "draft",
                created_at: "2026-08-06 12:40:00",
                updated_at: "2026-08-06 12:40:00",
            },
        ],
        follows: ["bob", "carol", "erin"],
        favorites: ["bob:0", "carol:0", "erin:0"],
        likes: ["bob:0", "carol:0", "erin:0", "bob:1"],
    },
    {
        username: "bob",
        email: "bob@example.com",
        posts: [
            {
                content: "最近用 Bun 重写了公司的后端，SQLite 直接嵌在进程里，部署都不用带数据库了，快得离谱。",
                tags: ["bun", "backend"],
                created_at: "2026-08-01 09:40:00",
            },
            {
                content: "折腾了一下 shadcn 的 Base UI 版本，组件可组合性比 headless ui 强不少，强烈推荐试试。",
                tags: ["shadcn", "ui"],
                created_at: "2026-07-28 14:30:00",
            },
        ],
        drafts: [
            {
                content: "最近用 Bun 重写了公司的后端，SQLite 直接嵌在进程里，部署都不用带数据库了，快得离谱。",
                tags: ["bun", "backend"],
                status: "published",
                post_key: "bob:0",
                created_at: "2026-08-01 09:35:00",
                updated_at: "2026-08-01 09:40:00",
            },
            {
                content: "折腾了一下 shadcn 的 Base UI 版本，组件可组合性比 headless ui 强不少，强烈推荐试试。",
                tags: ["shadcn", "ui"],
                status: "published",
                post_key: "bob:1",
                created_at: "2026-07-28 14:20:00",
                updated_at: "2026-07-28 14:30:00",
            },
            {
                content: "个人博客留言板想做成匿名也能发，但想防刷屏，验证码 + 频率限制怎么平衡比较好？",
                tags: ["backend", "security"],
                status: "draft",
                created_at: "2026-08-05 19:00:00",
                updated_at: "2026-08-05 19:00:00",
            },
        ],
        follows: ["alice", "carol"],
        favorites: ["alice:0", "carol:0"],
        likes: ["alice:0", "carol:0", "alice:1"],
    },
    {
        username: "carol",
        email: "carol@example.com",
        posts: [
            {
                content: "Tailwind v4 的 @theme 变量用起来比旧版配置文件舒服太多了，直接在 CSS 里定义设计令牌。",
                tags: ["tailwind", "css"],
                created_at: "2026-07-29 11:10:00",
            },
            {
                content: "把评论列表改成了无限滚动，交互好了不少，顺便学了下 IntersectionObserver 的用法。",
                tags: ["react", "ui"],
                created_at: "2026-07-24 18:45:00",
            },
            {
                content:
                    "# Markdown 与 LaTeX 演示\n\n这是一段 **加粗**、*斜体* 和 ~~删除线~~ 的文本，还支持 `行内代码`。\n\n- 列表项一\n- 列表项二\n\n> 引用块：帖子内容支持 Markdown 渲染。\n\n```ts\nconst sum = (a: number, b: number): number => a + b;\n```\n\n| 语法 | 效果 |\n| --- | --- |\n| 行内公式 | $E = mc^2$ |\n| 块级公式 | $$\\int_0^1 x^2 \\, dx = \\frac{1}{3}$$ |",
                tags: ["markdown", "latex"],
                created_at: "2026-08-03 15:00:00",
            },
        ],
        drafts: [
            {
                content: "Tailwind v4 的 @theme 变量用起来比旧版配置文件舒服太多了，直接在 CSS 里定义设计令牌。",
                tags: ["tailwind", "css"],
                status: "published",
                post_key: "carol:0",
                created_at: "2026-07-29 10:55:00",
                updated_at: "2026-07-29 11:10:00",
            },
            {
                content: "把评论列表改成了无限滚动，交互好了不少，顺便学了下 IntersectionObserver 的用法。",
                tags: ["react", "ui"],
                status: "published",
                post_key: "carol:1",
                created_at: "2026-07-24 18:30:00",
                updated_at: "2026-07-24 18:45:00",
            },
            {
                content:
                    "# Markdown 与 LaTeX 演示\n\n这是一段 **加粗**、*斜体* 和 ~~删除线~~ 的文本，还支持 `行内代码`。\n\n- 列表项一\n- 列表项二\n\n> 引用块：帖子内容支持 Markdown 渲染。\n\n```ts\nconst sum = (a: number, b: number): number => a + b;\n```\n\n| 语法 | 效果 |\n| --- | --- |\n| 行内公式 | $E = mc^2$ |\n| 块级公式 | $$\\int_0^1 x^2 \\, dx = \\frac{1}{3}$$ |",
                tags: ["markdown", "latex"],
                status: "published",
                post_key: "carol:2",
                created_at: "2026-08-03 14:50:00",
                updated_at: "2026-08-03 15:00:00",
            },
            {
                content: "画了个组件库的目录结构草图，还没定公共 API 怎么暴露，先存草稿慢慢想。",
                tags: ["design"],
                status: "draft",
                created_at: "2026-08-06 16:20:00",
                updated_at: "2026-08-06 16:20:00",
            },
        ],
        follows: ["alice", "bob", "dave"],
        favorites: ["alice:1", "bob:1"],
        likes: ["alice:0", "bob:1", "dave:0"],
    },
    {
        username: "dave",
        email: "dave@example.com",
        posts: [
            {
                content: "新手求问：刚学前端，Vite 和 Webpack 到底该优先学哪个？看了好多帖子还是纠结。",
                tags: ["vite", "新手"],
                created_at: "2026-07-31 20:15:00",
            },
        ],
        drafts: [
            {
                content: "新手求问：刚学前端，Vite 和 Webpack 到底该优先学哪个？看了好多帖子还是纠结。",
                tags: ["vite", "新手"],
                status: "published",
                post_key: "dave:0",
                created_at: "2026-07-31 20:05:00",
                updated_at: "2026-07-31 20:15:00",
            },
            {
                content: "最近面试老被问 HTTP 缓存，想整理一篇《强缓存与协商缓存全解》，先起个草稿打打腹稿。",
                tags: ["http", "前端"],
                status: "draft",
                created_at: "2026-08-05 11:10:00",
                updated_at: "2026-08-05 11:10:00",
            },
        ],
        follows: ["alice", "bob", "carol"],
        favorites: ["alice:0", "bob:0", "carol:1"],
        likes: ["alice:1", "bob:0", "carol:1"],
    },
    {
        username: "erin",
        email: "erin@example.com",
        posts: [
            {
                content: "写了个账号系统，argon2id 加密确实比 bcrypt 稳，Bun 内置 API 一条命令搞定。",
                tags: ["security", "backend"],
                created_at: "2026-08-02 08:55:00",
            },
        ],
        drafts: [
            {
                content: "写了个账号系统，argon2id 加密确实比 bcrypt 稳，Bun 内置 API 一条命令搞定。",
                tags: ["security", "backend"],
                status: "published",
                post_key: "erin:0",
                created_at: "2026-08-02 08:45:00",
                updated_at: "2026-08-02 08:55:00",
            },
            {
                content:
                    "打算写篇 JWT 在前后端怎么安全存放的文章：放 localStorage 容易 XSS 偷，放在内存会丢登录态，纠结。",
                tags: ["security", "jwt"],
                status: "draft",
                created_at: "2026-08-05 22:00:00",
                updated_at: "2026-08-06 09:15:00",
            },
            {
                content: "两行代码实现限流中间件，思路清晰又省事，等有空整理成教程发出来。",
                tags: ["backend"],
                status: "draft",
                created_at: "2026-08-07 08:30:00",
                updated_at: "2026-08-07 08:30:00",
            },
        ],
        follows: ["carol", "dave"],
        favorites: ["carol:0"],
        likes: ["carol:0", "dave:0"],
    },
];

const seedComments: {
    post_key: string;
    author: string;
    content: string;
    created_at: string;
    parent_content?: string;
    liked_by?: string[];
}[] = [
    {
        post_key: "bob:0",
        author: "alice",
        content: "Bun 这套确实香，我也准备迁移了。",
        created_at: "2026-08-01 10:00:00",
        liked_by: ["dave", "carol"],
    },
    {
        post_key: "bob:0",
        author: "dave",
        content: "请问 SQLite 并发写入会有问题吗？",
        created_at: "2026-08-01 10:30:00",
        liked_by: ["alice"],
    },
    {
        post_key: "bob:0",
        author: "alice",
        content: "写了就直接跑，不用管并发，本地先能跑通再说。",
        created_at: "2026-08-01 10:40:00",
        parent_content: "请问 SQLite 并发写入会有问题吗？",
    },
    {
        post_key: "alice:0",
        author: "bob",
        content: "博客我还没迁，主要是插件生态顾虑。",
        created_at: "2026-07-30 12:00:00",
    },
    {
        post_key: "alice:1",
        author: "carol",
        content: "zustand 配 immer 简直绝配。",
        created_at: "2026-07-25 22:00:00",
        liked_by: ["erin", "dave"],
    },
    {
        post_key: "carol:0",
        author: "erin",
        content: "@theme 确实比 tailwind.config 直观。",
        created_at: "2026-07-29 12:20:00",
    },
    {
        post_key: "carol:0",
        author: "alice",
        content: "自定义 CSS 变量和 @theme 混用的坑很多，注意版本。",
        created_at: "2026-07-29 12:40:00",
        parent_content: "@theme 确实比 tailwind.config 直观。",
    },
    {
        post_key: "dave:0",
        author: "carol",
        content: "先学 Vite 吧，上手快，底层理解可以后面补。",
        created_at: "2026-08-01 09:00:00",
        liked_by: ["erin"],
    },
];

async function insertOrGetUser(username: string, email: string, passwordHash: string): Promise<number | null> {
    const users = await store.read<StoredUser>(C.users);
    const existing = users.find((user) => user.username === username);
    if (existing) return existing.id;
    const created = await storage.users.createUser(username, email, passwordHash, null);
    return created.id;
}

async function findExistingPost(userId: number, content: string): Promise<number | undefined> {
    const posts = (await store.read<StoredPost>(C.posts)).filter((row) => row.user_id === userId);
    for (const post of posts) {
        if ((await loadContentBlob(blobs, post.content)) === content) return post.id;
    }
    return undefined;
}

async function findExistingDraft(userId: number, content: string): Promise<number | undefined> {
    const drafts = (await store.read<StoredDraft>(C.drafts)).filter((row) => row.user_id === userId);
    for (const draft of drafts) {
        if ((await loadContentBlob(blobs, draft.content)) === content) return draft.id;
    }
    return undefined;
}

async function findExistingComment(postId: number, userId: number, content: string): Promise<number | undefined> {
    const comments = (await store.read<StoredComment>(C.comments)).filter(
        (row) => row.post_id === postId && row.user_id === userId,
    );
    for (const comment of comments) {
        if ((await loadContentBlob(blobs, comment.content)) === content) return comment.id;
    }
    return undefined;
}

async function attachPostTags(postId: number, tagNames: string[]): Promise<void> {
    for (const name of tagNames) {
        const tagId = await getOrCreateTag(store, name);
        if (tagId == null) continue;
        const existing = await store.read<StoredPostTag>(C.postTags);
        if (existing.some((row) => row.post_id === postId && row.tag_id === tagId)) continue;
        await store.append<StoredPostTag>(C.postTags, { post_id: postId, tag_id: tagId });
    }
}

async function attachDraftTags(draftId: number, tagNames: string[]): Promise<void> {
    for (const name of tagNames) {
        const tagId = await getOrCreateTag(store, name);
        if (tagId == null) continue;
        const existing = await store.read<StoredDraftTag>(C.draftTags);
        if (existing.some((row) => row.draft_id === draftId && row.tag_id === tagId)) continue;
        await store.append<StoredDraftTag>(C.draftTags, { draft_id: draftId, tag_id: tagId });
    }
}

async function main() {
    const passwordHash = await Bun.password.hash(PASSWORD, {
        algorithm: "argon2id",
        memoryCost: 65536,
        timeCost: 3,
    });

    if (reset) {
        const allUsers = await store.read<StoredUser>(C.users);
        const userIds = allUsers.filter((user) => SAMPLE_USERNAMES.includes(user.username)).map((user) => user.id);
        const userIdSet = new Set(userIds);

        if (userIdSet.size > 0) {
            const [allComments, allPosts, allDrafts] = await Promise.all([
                store.read<StoredComment>(C.comments),
                store.read<StoredPost>(C.posts),
                store.read<StoredDraft>(C.drafts),
            ]);

            const commentsByUser = allComments.filter((row) => userIdSet.has(row.user_id));
            const postsByUser = allPosts.filter((row) => userIdSet.has(row.user_id));
            const draftsByUser = allDrafts.filter((row) => userIdSet.has(row.user_id));

            await Promise.all([
                ...draftsByUser.map((row) => deleteContentBlob(blobs, row.content)),
                ...postsByUser.map((row) => deleteContentBlob(blobs, row.content)),
                ...commentsByUser.map((row) => deleteContentBlob(blobs, row.content)),
            ]);

            const commentIdsByUser = new Set(commentsByUser.map((row) => row.id));

            await store.deleteWhere<StoredDraft>(C.drafts, (row) => userIdSet.has(row.user_id));
            await store.deleteWhere<StoredCommentLike>(C.commentLikes, (row) => commentIdsByUser.has(row.comment_id));
            await store.deleteWhere<StoredComment>(C.comments, (row) => userIdSet.has(row.user_id));
            await store.deleteWhere<StoredFavorite>(C.favorites, (row) => userIdSet.has(row.user_id));
            await store.deleteWhere<StoredLike>(C.likes, (row) => userIdSet.has(row.user_id));
            await store.deleteWhere<StoredFollow>(
                C.follows,
                (row) => userIdSet.has(row.follower_id) || userIdSet.has(row.following_id),
            );
            await store.deleteWhere<StoredPostTag>(C.postTags, (row) =>
                postsByUser.some((post) => post.id === row.post_id),
            );
            await store.deleteWhere<StoredDraftTag>(C.draftTags, (row) =>
                draftsByUser.some((draft) => draft.id === row.draft_id),
            );
            await store.deleteWhere<StoredPost>(C.posts, (row) => userIdSet.has(row.user_id));
            await store.deleteWhere<StoredUser>(C.users, (row) => userIdSet.has(row.id));
        }

        console.log(`已删除 ${userIdSet.size} 个示例账号（含其帖子/评论/收藏/关注/草稿）`);
    }

    const idMap = new Map<string, number>();
    for (const user of seedUsers) {
        const id = await insertOrGetUser(user.username, user.email, passwordHash);
        if (!id) throw new Error(`创建用户失败: ${user.username}`);
        idMap.set(user.username, id);
    }

    const postIds = new Map<string, number>();
    for (const user of seedUsers) {
        const userId = idMap.get(user.username)!;

        for (const [index, post] of user.posts.entries()) {
            const existingId = await findExistingPost(userId, post.content);
            let postId: number;
            if (existingId != null) {
                postId = existingId;
            } else {
                const contentRef = await saveContentBlob(blobs, post.content);
                const inserted = await store.insert<StoredPost>(C.posts, {
                    user_id: userId,
                    content: contentRef,
                    created_at: post.created_at,
                });
                postId = inserted.id;
                await attachPostTags(postId, post.tags);
            }
            postIds.set(`${user.username}:${index}`, postId);
        }

        for (const draft of user.drafts) {
            const existingId = await findExistingDraft(userId, draft.content);
            if (existingId != null) continue;

            const postId =
                draft.status === "published" && draft.post_key ? (postIds.get(draft.post_key) ?? null) : null;
            const contentRef = await saveContentBlob(blobs, draft.content);
            const inserted = await store.insert<StoredDraft>(C.drafts, {
                user_id: userId,
                content: contentRef,
                status: draft.status,
                post_id: postId,
                created_at: draft.created_at,
                updated_at: draft.updated_at,
            });
            await attachDraftTags(inserted.id, draft.tags);
        }
    }

    for (const user of seedUsers) {
        const followerId = idMap.get(user.username)!;
        for (const target of user.follows) {
            const targetId = idMap.get(target);
            if (targetId !== undefined) {
                await store.append<StoredFollow>(C.follows, {
                    follower_id: followerId,
                    following_id: targetId,
                    created_at: new Date().toISOString(),
                });
            }
        }
        for (const key of user.favorites) {
            const postId = postIds.get(key);
            if (postId !== undefined) {
                await store.append<StoredFavorite>(C.favorites, {
                    id: Math.random(),
                    user_id: followerId,
                    post_id: postId,
                    created_at: new Date().toISOString(),
                });
            }
        }
        for (const key of user.likes) {
            const postId = postIds.get(key);
            if (postId !== undefined) {
                await store.append<StoredLike>(C.likes, {
                    id: Math.random(),
                    user_id: followerId,
                    post_id: postId,
                    created_at: new Date().toISOString(),
                });
            }
        }
    }

    for (const comment of seedComments) {
        const postId = postIds.get(comment.post_key);
        const authorId = idMap.get(comment.author);
        if (postId === undefined || authorId === undefined) continue;

        const existingId = await findExistingComment(postId, authorId, comment.content);
        let commentId: number;
        if (existingId != null) {
            commentId = existingId;
        } else {
            let parentId: number | null = null;
            if (comment.parent_content) {
                const comments = await store.read<StoredComment>(C.comments);
                for (const row of comments) {
                    if (
                        row.post_id === postId &&
                        (await loadContentBlob(blobs, row.content)) === comment.parent_content
                    ) {
                        parentId = row.id;
                        break;
                    }
                }
            }
            const contentRef = await saveContentBlob(blobs, comment.content);
            const inserted = await store.insert<StoredComment>(C.comments, {
                post_id: postId,
                user_id: authorId,
                content: contentRef,
                created_at: comment.created_at,
                parent_id: parentId,
            });
            commentId = inserted.id;
        }

        if (comment.liked_by) {
            for (const liker of comment.liked_by) {
                const likerId = idMap.get(liker);
                if (likerId !== undefined) {
                    await store.append<StoredCommentLike>(C.commentLikes, {
                        id: Math.random(),
                        comment_id: commentId,
                        user_id: likerId,
                        created_at: comment.created_at,
                    });
                }
            }
        }
    }

    const [allPosts, allFavorites, allLikes, allFollows, allDrafts] = await Promise.all([
        store.read<StoredPost>(C.posts),
        store.read<StoredFavorite>(C.favorites),
        store.read<StoredLike>(C.likes),
        store.read<StoredFollow>(C.follows),
        store.read<StoredDraft>(C.drafts),
    ]);

    for (const user of seedUsers) {
        const id = idMap.get(user.username)!;
        const postsCount = allPosts.filter((row) => row.user_id === id).length;
        const favoritesCount = allFavorites.filter((row) => row.user_id === id).length;
        const likesCount = allLikes.filter((row) => row.user_id === id).length;
        const followingCount = allFollows.filter((row) => row.follower_id === id).length;
        const followersCount = allFollows.filter((row) => row.following_id === id).length;
        console.log(
            `${user.username}(${user.email}) 密码 ${PASSWORD} — 帖子 ${postsCount} / 收藏 ${favoritesCount} / 点赞 ${likesCount} / 关注 ${followingCount} / 粉丝 ${followersCount}`,
        );
    }

    console.log(`共插入帖子 ${postIds.size} 条，评论 ${seedComments.length} 条。`);

    const publishedCount = allDrafts.filter((row) => row.status === "published").length;
    const draftCount = allDrafts.filter((row) => row.status === "draft").length;
    console.log(`草稿：已发布 ${publishedCount} 条 / 未发布 ${draftCount} 条。`);
    console.log("提示：请先停止运行中的 server（bun index.ts），再启动以刷新数据。");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
