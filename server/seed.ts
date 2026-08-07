// 生成调试数据
import { Database } from "bun:sqlite";

const PASSWORD = "123456";
const SAMPLE_USERNAMES = ["alice", "bob", "carol", "dave", "erin"];

const db = new Database(import.meta.dir + "/app.db");
db.run("PRAGMA foreign_keys = ON");

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

const users: SeedUser[] = [
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
                content: "最近在整理一份 React 性能优化清单：useMemo/useCallback 别乱用，子树拆分会更直接。写一半还没想好怎么组织。",
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
                content: "个人博客留言板想做成匿名也能发，但又想防刷屏，验证码 + 频率限制怎么平衡比较好？",
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
                content: "打算写篇 JWT 在前后端怎么安全存放的文章：放 localStorage 容易 XSS 偷，放在内存会丢登录态，纠结。",
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

const seedComments: { post_key: string; author: string; content: string; created_at: string }[] = [
    {
        post_key: "bob:0",
        author: "alice",
        content: "Bun 这套确实香，我也准备迁移了。",
        created_at: "2026-08-01 10:00:00",
    },
    {
        post_key: "bob:0",
        author: "dave",
        content: "请问 SQLite 并发写入会有问题吗？",
        created_at: "2026-08-01 10:30:00",
    },
    {
        post_key: "alice:0",
        author: "bob",
        content: "博客我还没迁，主要是插件生态顾虑。",
        created_at: "2026-07-30 12:00:00",
    },
    { post_key: "alice:1", author: "carol", content: "zustand 配 immer 简直绝配。", created_at: "2026-07-25 22:00:00" },
    {
        post_key: "carol:0",
        author: "erin",
        content: "@theme 确实比 tailwind.config 直观。",
        created_at: "2026-07-29 12:20:00",
    },
    {
        post_key: "dave:0",
        author: "carol",
        content: "先学 Vite 吧，上手快，底层理解可以后面补。",
        created_at: "2026-08-01 09:00:00",
    },
];

function insertOrGetId(username: string, email: string, passwordHash: string): number | null {
    const existing = db.query("SELECT id FROM users WHERE username = ?").get(username) as { id: number } | null;
    if (existing) return existing.id;
    const result = db
        .query("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
        .run(username, email, passwordHash);
    return Number(result.lastInsertRowid);
}

function buildUserIdMap(): Map<string, number> {
    const rows = db
        .query("SELECT id, username FROM users WHERE username IN (SELECT value FROM json_each(?, '$'))")
        .all(JSON.stringify(SAMPLE_USERNAMES)) as { id: number; username: string }[];
    return new Map(rows.map((row) => [row.username, row.id]));
}

async function main() {
    if (reset) {
        const ids = db
            .query("SELECT id FROM users WHERE username IN (SELECT value FROM json_each(?, '$'))")
            .all(JSON.stringify(SAMPLE_USERNAMES)) as { id: number }[];
        for (const { id } of ids) {
            db.query("DELETE FROM drafts WHERE user_id = ?").run(id);
            db.query("DELETE FROM comments WHERE user_id = ?").run(id);
            db.query("DELETE FROM favorites WHERE user_id = ?").run(id);
            db.query("DELETE FROM likes WHERE user_id = ?").run(id);
            db.query("DELETE FROM follows WHERE follower_id = ? OR following_id = ?").run(id, id);
            db.query("DELETE FROM posts WHERE user_id = ?").run(id);
            db.query("DELETE FROM users WHERE id = ?").run(id);
        }
        console.log(`已删除 ${ids.length} 个示例账号（含其帖子/评论/收藏/关注/草稿）`);
    }

    const passwordHash = await Bun.password.hash(PASSWORD, {
        algorithm: "argon2id",
        memoryCost: 65536,
        timeCost: 3,
    });

    const idMap = new Map<string, number>();
    for (const user of users) {
        const id = insertOrGetId(user.username, user.email, passwordHash);
        if (!id) throw new Error(`创建用户失败: ${user.username}`);
        idMap.set(user.username, id);
    }

    const postIds = new Map<string, number>();
    for (const user of users) {
        user.posts.forEach((post, index) => {
            const existing = db
                .query("SELECT id FROM posts WHERE user_id = ? AND content = ?")
                .get(idMap.get(user.username)!, post.content) as { id: number } | null;
            let postId: number;
            if (existing) {
                postId = existing.id;
            } else {
                const result = db
                    .query("INSERT INTO posts (user_id, content, created_at) VALUES (?, ?, ?)")
                    .run(idMap.get(user.username)!, post.content, post.created_at);
                postId = Number(result.lastInsertRowid);
                for (const tag of post.tags) {
                    db.query("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(tag);
                    const tagId = db.query("SELECT id FROM tags WHERE name = ?").get(tag) as { id: number };
                    db.query("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)").run(postId, tagId.id);
                }
            }
            postIds.set(`${user.username}:${index}`, postId);
        });

        for (const draft of user.drafts) {
            const userId = idMap.get(user.username)!;
            const existing = db
                .query("SELECT id FROM drafts WHERE user_id = ? AND content = ?")
                .get(userId, draft.content) as { id: number } | null;
            let draftId: number;
            if (existing) {
                draftId = existing.id;
            } else {
                const postId =
                    draft.status === "published" && draft.post_key
                        ? (postIds.get(draft.post_key) ?? null)
                        : null;
                const result = db
                    .query(
                        "INSERT INTO drafts (user_id, content, status, post_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    )
                    .run(userId, draft.content, draft.status, postId, draft.created_at, draft.updated_at);
                draftId = Number(result.lastInsertRowid);
                for (const tag of draft.tags) {
                    db.query("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(tag);
                    const tagId = db.query("SELECT id FROM tags WHERE name = ?").get(tag) as {
                        id: number;
                    };
                    db.query("INSERT OR IGNORE INTO draft_tags (draft_id, tag_id) VALUES (?, ?)").run(
                        draftId,
                        tagId.id,
                    );
                }
            }
        }
    }

    for (const user of users) {
        for (const target of user.follows) {
            const targetId = idMap.get(target);
            if (targetId !== undefined) {
                db.query("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)").run(
                    idMap.get(user.username)!,
                    targetId,
                );
            }
        }
        for (const key of user.favorites) {
            const postId = postIds.get(key);
            if (postId !== undefined) {
                db.query("INSERT OR IGNORE INTO favorites (user_id, post_id) VALUES (?, ?)").run(
                    idMap.get(user.username)!,
                    postId,
                );
            }
        }
        for (const key of user.likes) {
            const postId = postIds.get(key);
            if (postId !== undefined) {
                db.query("INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)").run(
                    idMap.get(user.username)!,
                    postId,
                );
            }
        }
    }

    for (const comment of seedComments) {
        const postId = postIds.get(comment.post_key);
        const authorId = idMap.get(comment.author);
        if (postId !== undefined && authorId !== undefined) {
            const existing = db
                .query("SELECT id FROM comments WHERE post_id = ? AND user_id = ? AND content = ?")
                .get(postId, authorId, comment.content);
            if (!existing) {
                db.query("INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)").run(
                    postId,
                    authorId,
                    comment.content,
                    comment.created_at,
                );
            }
        }
    }

    for (const user of users) {
        const id = idMap.get(user.username)!;
        const counts = db
            .query(
                `SELECT
                    (SELECT COUNT(*) FROM posts p WHERE p.user_id = ?) AS posts,
                    (SELECT COUNT(*) FROM favorites f WHERE f.user_id = ?) AS favorites,
                    (SELECT COUNT(*) FROM likes l WHERE l.user_id = ?) AS likes,
                    (SELECT COUNT(*) FROM follows f WHERE f.follower_id = ?) AS following,
                    (SELECT COUNT(*) FROM follows f WHERE f.following_id = ?) AS followers`,
            )
            .get(id, id, id, id, id) as {
            posts: number;
            favorites: number;
            likes: number;
            following: number;
            followers: number;
        };
        console.log(
            `${user.username}(${user.email}) 密码 ${PASSWORD} — 帖子 ${counts.posts} / 收藏 ${counts.favorites} / 点赞 ${counts.likes} / 关注 ${counts.following} / 粉丝 ${counts.followers}`,
        );
    }

    console.log(`共插入帖子 ${postIds.size} 条，评论 ${seedComments.length} 条。`);

    const draftCounts = (db.query(
        `SELECT
            (SELECT COUNT(*) FROM drafts WHERE status = 'published') AS published,
            (SELECT COUNT(*) FROM drafts WHERE status = 'draft') AS draft`,
    ).get() as { published: number; draft: number });
    console.log(`草稿：已发布 ${draftCounts.published} 条 / 未发布 ${draftCounts.draft} 条。`);
    console.log("提示：请先停止运行中的 server（bun index.ts），再启动以刷新数据。");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
