// 生成调试数据
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "./src/db/client";
import {
    commentLikes,
    comments,
    draftTags,
    drafts,
    favorites,
    follows,
    likes,
    postTags,
    posts,
    tags,
    users,
} from "./src/db/schema";

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

function insertOrGetId(username: string, email: string, passwordHash: string): number | null {
    const existing = db.select({ id: users.id }).from(users).where(eq(users.username, username)).get();
    if (existing) return existing.id;
    const row = db.insert(users).values({ username, email, password_hash: passwordHash }).returning().get();
    return row?.id ?? null;
}

function attachTags(ownerId: number, tagNames: string[], table: "post" | "draft"): void {
    for (const name of tagNames) {
        db.insert(tags).values({ name }).onConflictDoNothing().run();
        const tag = db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
        if (tag) {
            if (table === "post") {
                db.insert(postTags).values({ post_id: ownerId, tag_id: tag.id }).onConflictDoNothing().run();
            } else {
                db.insert(draftTags).values({ draft_id: ownerId, tag_id: tag.id }).onConflictDoNothing().run();
            }
        }
    }
}

async function main() {
    if (reset) {
        const userIds = db
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.username, SAMPLE_USERNAMES))
            .all()
            .map((row) => row.id);
        for (const id of userIds) {
            db.delete(drafts).where(eq(drafts.user_id, id)).run();
            db.delete(commentLikes).where(eq(commentLikes.user_id, id)).run();
            db.delete(comments).where(eq(comments.user_id, id)).run();
            db.delete(favorites).where(eq(favorites.user_id, id)).run();
            db.delete(likes).where(eq(likes.user_id, id)).run();
            db.delete(follows)
                .where(or(eq(follows.follower_id, id), eq(follows.following_id, id)))
                .run();
            db.delete(posts).where(eq(posts.user_id, id)).run();
            db.delete(users).where(eq(users.id, id)).run();
        }
        console.log(`已删除 ${userIds.length} 个示例账号（含其帖子/评论/收藏/关注/草稿）`);
    }

    const passwordHash = await Bun.password.hash(PASSWORD, {
        algorithm: "argon2id",
        memoryCost: 65536,
        timeCost: 3,
    });

    const idMap = new Map<string, number>();
    for (const user of seedUsers) {
        const id = insertOrGetId(user.username, user.email, passwordHash);
        if (!id) throw new Error(`创建用户失败: ${user.username}`);
        idMap.set(user.username, id);
    }

    const postIds = new Map<string, number>();
    for (const user of seedUsers) {
        user.posts.forEach((post, index) => {
            const existing = db
                .select({ id: posts.id })
                .from(posts)
                .where(and(eq(posts.user_id, idMap.get(user.username)!), eq(posts.content, post.content)))
                .get();
            let postId: number;
            if (existing) {
                postId = existing.id;
            } else {
                const inserted = db
                    .insert(posts)
                    .values({ user_id: idMap.get(user.username)!, content: post.content, created_at: post.created_at })
                    .returning()
                    .get();
                postId = inserted.id;
                attachTags(postId, post.tags, "post");
            }
            postIds.set(`${user.username}:${index}`, postId);
        });

        for (const draft of user.drafts) {
            const userId = idMap.get(user.username)!;
            const existing = db
                .select({ id: drafts.id })
                .from(drafts)
                .where(and(eq(drafts.user_id, userId), eq(drafts.content, draft.content)))
                .get();
            if (existing) continue;
            const postId =
                draft.status === "published" && draft.post_key ? (postIds.get(draft.post_key) ?? null) : null;
            const inserted = db
                .insert(drafts)
                .values({
                    user_id: userId,
                    content: draft.content,
                    status: draft.status,
                    post_id: postId,
                    created_at: draft.created_at,
                    updated_at: draft.updated_at,
                })
                .returning()
                .get();
            attachTags(inserted.id, draft.tags, "draft");
        }
    }

    for (const user of seedUsers) {
        const followerId = idMap.get(user.username)!;
        for (const target of user.follows) {
            const targetId = idMap.get(target);
            if (targetId !== undefined) {
                db.insert(follows)
                    .values({ follower_id: followerId, following_id: targetId })
                    .onConflictDoNothing()
                    .run();
            }
        }
        for (const key of user.favorites) {
            const postId = postIds.get(key);
            if (postId !== undefined) {
                db.insert(favorites).values({ user_id: followerId, post_id: postId }).onConflictDoNothing().run();
            }
        }
        for (const key of user.likes) {
            const postId = postIds.get(key);
            if (postId !== undefined) {
                db.insert(likes).values({ user_id: followerId, post_id: postId }).onConflictDoNothing().run();
            }
        }
    }

    for (const comment of seedComments) {
        const postId = postIds.get(comment.post_key);
        const authorId = idMap.get(comment.author);
        if (postId === undefined || authorId === undefined) continue;
        const existing = db
            .select({ id: comments.id })
            .from(comments)
            .where(
                and(
                    eq(comments.post_id, postId),
                    eq(comments.user_id, authorId),
                    eq(comments.content, comment.content),
                ),
            )
            .get();
        let commentId: number;
        if (existing) {
            commentId = existing.id;
        } else {
            let parentId: number | null = null;
            if (comment.parent_content) {
                const parent = db
                    .select({ id: comments.id })
                    .from(comments)
                    .where(and(eq(comments.post_id, postId), eq(comments.content, comment.parent_content)))
                    .get();
                parentId = parent?.id ?? null;
            }
            const res = db
                .insert(comments)
                .values({
                    post_id: postId,
                    user_id: authorId,
                    content: comment.content,
                    created_at: comment.created_at,
                    parent_id: parentId ?? undefined,
                })
                .returning({ id: comments.id })
                .get();
            commentId = res?.id ?? 0;
        }
        if (comment.liked_by) {
            for (const liker of comment.liked_by) {
                const likerId = idMap.get(liker);
                if (likerId !== undefined && commentId) {
                    db.insert(commentLikes)
                        .values({ comment_id: commentId, user_id: likerId, created_at: comment.created_at })
                        .onConflictDoNothing()
                        .run();
                }
            }
        }
    }

    for (const user of seedUsers) {
        const id = idMap.get(user.username)!;
        const postsCount = db
            .select({ n: sql<number>`count(*)` })
            .from(posts)
            .where(eq(posts.user_id, id))
            .get()!.n;
        const favoritesCount = db
            .select({ n: sql<number>`count(*)` })
            .from(favorites)
            .where(eq(favorites.user_id, id))
            .get()!.n;
        const likesCount = db
            .select({ n: sql<number>`count(*)` })
            .from(likes)
            .where(eq(likes.user_id, id))
            .get()!.n;
        const followingCount = db
            .select({ n: sql<number>`count(*)` })
            .from(follows)
            .where(eq(follows.follower_id, id))
            .get()!.n;
        const followersCount = db
            .select({ n: sql<number>`count(*)` })
            .from(follows)
            .where(eq(follows.following_id, id))
            .get()!.n;
        console.log(
            `${user.username}(${user.email}) 密码 ${PASSWORD} — 帖子 ${postsCount} / 收藏 ${favoritesCount} / 点赞 ${likesCount} / 关注 ${followingCount} / 粉丝 ${followersCount}`,
        );
    }

    console.log(`共插入帖子 ${postIds.size} 条，评论 ${seedComments.length} 条。`);

    const [publishedCount, draftCount] = db.get(
        sql`
        SELECT
            (SELECT COUNT(*) FROM drafts WHERE status = 'published') AS published,
            (SELECT COUNT(*) FROM drafts WHERE status = 'draft') AS draft`,
    ) as [number, number];
    console.log(`草稿：已发布 ${publishedCount} 条 / 未发布 ${draftCount} 条。`);
    console.log("提示：请先停止运行中的 server（bun index.ts），再启动以刷新数据。");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
