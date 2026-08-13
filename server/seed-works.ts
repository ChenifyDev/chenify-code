// 生成示例编程作品（多文件、改编链、点赞/收藏/评论）
import { inArray, sql } from "drizzle-orm";
import { db as mainDb } from "./src/db/client";
import { users } from "./src/db/schema";
import { db } from "./src/works";
import {
    workCommentLikes,
    workComments,
    workDraftFiles,
    workDrafts,
    workFavorites,
    workFiles,
    workLikes,
    works,
} from "./src/works/schema";

const SAMPLE_USERNAMES = ["alice", "bob", "carol", "dave", "erin"];

interface SeedFile {
    name: string;
    content: string;
}

interface SeedComment {
    username: string;
    content: string;
    created_at: string;
    parent_content?: string;
    liked_by?: string[];
}

interface SeedWork {
    username: string;
    title: string;
    description: string;
    files: SeedFile[];
    parent_key?: string; // 形如 "<作者>:<标题>" 指向改编源作品
    likes: string[];
    favorites: string[];
    comments: SeedComment[];
    created_at: string;
}

interface SeedWorkDraft {
    username: string;
    title: string;
    description: string;
    files: SeedFile[];
}

const seedWorks: SeedWork[] = [
    {
        username: "alice",
        title: "天气查询 CLI",
        description: "一个用 requests 与 argparse 编写的命令行天气查询工具，展示多文件 Python 工程结构。",
        created_at: "2026-08-02 09:30:00",
        files: [
            {
                name: "weather.py",
                content:
                    'import argparse\n\nfrom client import fetch_weather\n\n\ndef main() -> None:\n    parser = argparse.ArgumentParser(description="查询城市天气")\n    parser.add_argument("city", help="城市名，例如 北京")\n    args = parser.parse_args()\n\n    data = fetch_weather(args.city)\n    print(f"{data[\'city\']}: {data[\'temperature\']}°C, {data[\'condition\']}")\n\n\nif __name__ == "__main__":\n    main()\n',
            },
            {
                name: "client.py",
                content:
                    'import requests\n\nBASE_URL = "https://api.example.com/weather"\n\n\ndef fetch_weather(city: str) -> dict[str, object]:\n    resp = requests.get(BASE_URL, params={"q": city}, timeout=5)\n    resp.raise_for_status()\n    return resp.json()\n',
            },
        ],
        likes: ["bob", "carol", "erin"],
        favorites: ["bob", "dave"],
        comments: [
            {
                username: "bob",
                content: "CLI 很干净！建议支持批量查询多个城市。",
                created_at: "2026-08-02 10:00:00",
                liked_by: ["carol"],
            },
            {
                username: "carol",
                content: "记得用 requests.Session 复用连接，性能更好。",
                created_at: "2026-08-02 10:30:00",
            },
            {
                username: "dave",
                content: "感谢建议，你在 v2 里就实现了 Session 复用。",
                created_at: "2026-08-02 10:45:00",
                parent_content: "记得用 requests.Session 复用连接，性能更好。",
            },
        ],
    },
    {
        username: "bob",
        title: "天气 CLI v2：多城市并发",
        description: "改编自 alice 的天气 CLI，用 concurrent.futures 支持一次查询多个城市。",
        parent_key: "alice:天气查询 CLI",
        created_at: "2026-08-03 08:20:00",
        files: [
            {
                name: "main.py",
                content:
                    'import argparse\nfrom concurrent.futures import ThreadPoolExecutor, as_completed\n\nfrom client import fetch_weather\n\n\ndef main() -> None:\n    parser = argparse.ArgumentParser(description="批量查询城市天气")\n    parser.add_argument("cities", nargs="+", help="一个或多个城市名")\n    args = parser.parse_args()\n\n    with ThreadPoolExecutor(max_workers=5) as pool:\n        futures = [pool.submit(fetch_weather, city) for city in args.cities]\n        for fut in as_completed(futures):\n            data = fut.result()\n            print(f"{data[\'city\']}: {data[\'temperature\']}°C, {data[\'condition\']}")\n\n\nif __name__ == "__main__":\n    main()\n',
            },
            {
                name: "client.py",
                content:
                    'import requests\n\nBASE_URL = "https://api.example.com/weather"\n\n\ndef fetch_weather(city: str) -> dict[str, object]:\n    resp = requests.get(BASE_URL, params={"q": city}, timeout=5)\n    resp.raise_for_status()\n    return resp.json()\n',
            },
        ],
        likes: ["alice", "dave"],
        favorites: ["carol"],
        comments: [
            {
                username: "alice",
                content: "并发版本很实用，可以再限定一下同时请求数。",
                created_at: "2026-08-03 09:00:00",
                liked_by: ["bob"],
            },
            {
                username: "bob",
                content: "好主意，下个版本用 ThreadPoolExecutor(max_workers) 控制。",
                created_at: "2026-08-03 09:20:00",
                parent_content: "并发版本很实用，可以再限定一下同时请求数。",
            },
        ],
    },
    {
        username: "bob",
        title: "Python 限流装饰器",
        description: "用 functools + time 实现的固定窗口限流装饰器，几乎零样板代码。",
        created_at: "2026-08-04 14:00:00",
        files: [
            {
                name: "ratelimit.py",
                content:
                    'import functools\nimport time\nfrom collections import defaultdict\n\n_hits: dict[str, list[float]] = defaultdict(list)\n\n\ndef rate_limit(limit: int, window_seconds: float):\n    def decorator(func):\n        @functools.wraps(func)\n        def wrapper(*args, **kwargs):\n            key = func.__module__ + "." + func.__name__\n            now = time.monotonic()\n            recent = [t for t in _hits[key] if now - t < window_seconds]\n            recent.append(now)\n            _hits[key] = recent\n            if len(recent) > limit:\n                raise RuntimeError("rate limit exceeded")\n            return func(*args, **kwargs)\n        return wrapper\n    return decorator\n',
            },
            {
                name: "test_ratelimit.py",
                content:
                    'import unittest\n\nfrom ratelimit import rate_limit\n\n\nclass RateLimitTest(unittest.TestCase):\n    def test_basic_limiting(self):\n        calls = []\n\n        @rate_limit(limit=2, window_seconds=1.0)\n        def work():\n            calls.append(1)\n\n        work()\n        work()\n        with self.assertRaises(RuntimeError):\n            work()\n        self.assertEqual(len(calls), 2)\n\n\nif __name__ == "__main__":\n    unittest.main()\n',
            },
        ],
        likes: ["erin", "alice", "dave"],
        favorites: ["dave"],
        comments: [
            {
                username: "dave",
                content: "单进程内存限流够用，多 worker 场景要换 Redis。",
                created_at: "2026-08-04 20:00:00",
                liked_by: ["carol"],
            },
        ],
    },
    {
        username: "carol",
        title: "迷你 Markdown 渲染器",
        description: "手写一个 200 行以内的 Markdown 子集解析器，附带单元测试。",
        created_at: "2026-08-01 16:00:00",
        files: [
            {
                name: "markdown.py",
                content:
                    'from __future__ import annotations\n\nfrom dataclasses import dataclass\n\n\n@dataclass(frozen=True)\nclass Block:\n    kind: str  # heading | list | code\n    text: str\n\n\ndef parse(src: str) -> list[Block]:\n    blocks: list[Block] = []\n    for line in src.splitlines():\n        if line.startswith("# "):\n            blocks.append(Block("heading", line[2:]))\n        elif line.startswith("- "):\n            blocks.append(Block("list", line[2:]))\n        elif line.startswith("```"):\n            blocks.append(Block("code", line[3:]))\n    return blocks\n\n\ndef to_html(src: str) -> str:\n    tags = {"heading": "h1", "list": "p", "code": "pre"}\n    return "\\n".join(f"<{tags[b.kind]}>{b.text}</{tags[b.kind]}>".replace("</pre>", "</code></pre>") for b in parse(src))\n',
            },
            {
                name: "test_markdown.py",
                content:
                    'import unittest\n\nfrom markdown import parse, to_html\n\n\nclass MarkdownTest(unittest.TestCase):\n    def test_parse_headings(self):\n        self.assertEqual(parse("# Hi")[0].kind, "heading")\n\n    def test_to_html(self):\n        self.assertIn("<h1>Hi</h1>", to_html("# Hi"))\n\n\nif __name__ == "__main__":\n    unittest.main()\n',
            },
        ],
        likes: ["erin", "dave"],
        favorites: ["bob"],
        comments: [
            { username: "erin", content: "收藏了，后面写静态博客生成器可以复用。", created_at: "2026-08-01 17:00:00" },
        ],
    },
    {
        username: "dave",
        title: "新手 Python 练习题",
        description: "包含斐波那契和哥德巴赫猜想的 Python 入门练习。",
        created_at: "2026-08-04 11:00:00",
        files: [
            {
                name: "fib_goldbach.py",
                content:
                    'def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n\n\ndef is_prime(x):\n    if x < 2:\n        return False\n    for i in range(2, int(x ** 0.5) + 1):\n        if x % i == 0:\n            return False\n    return True\n\n\nif __name__ == "__main__":\n    print("fib(10) =", fib(10))\n    print("23 是质数吗？", is_prime(23))\n',
            },
        ],
        likes: ["carol"],
        favorites: ["erin", "alice"],
        comments: [
            { username: "carol", content: "入门练手正合适，注释再多点更好。", created_at: "2026-08-04 12:00:00" },
        ],
    },
    {
        username: "dave",
        title: "Markdown 渲染器：表格扩展",
        description: "改编自 carol 的迷你渲染器，新增了表格与引用支持。",
        parent_key: "carol:迷你 Markdown 渲染器",
        created_at: "2026-08-05 09:00:00",
        files: [
            {
                name: "markdown.py",
                content:
                    'from __future__ import annotations\n\nfrom dataclasses import dataclass\n\n\n@dataclass(frozen=True)\nclass Block:\n    kind: str  # heading | quote | table\n    text: str\n\n\ndef parse(src: str) -> list[Block]:\n    blocks: list[Block] = []\n    for line in src.splitlines():\n        if line.startswith("> "):\n            blocks.append(Block("quote", line[2:]))\n        elif line.startswith("|") and line.endswith("|"):\n            cells = [c.strip() for c in line.strip("|").split("|")]\n            blocks.append(Block("table", "\\t".join(cells)))\n        else:\n            blocks.append(Block("heading", line))\n    return blocks\n\n\ndef to_html(src: str) -> str:\n    chunks: list[str] = []\n    for b in parse(src):\n        if b.kind == "heading":\n            chunks.append(f"<h1>{b.text}</h1>")\n        elif b.kind == "quote":\n            chunks.append(f"<blockquote>{b.text}</blockquote>")\n        else:\n            cells = b.text.split("\\t")\n            chunks.append("<table><tr>" + "".join(f"<th>{c}</th>" for c in cells) + "</tr></table>")\n    return "\\n".join(chunks)\n',
            },
            {
                name: "test_markdown.py",
                content:
                    'import unittest\n\nfrom markdown import parse, to_html\n\n\nclass MarkdownTest(unittest.TestCase):\n    def test_table(self):\n        html = to_html("| a | b |")\n        self.assertIn("<th>a</th>", html)\n\n    def test_quote(self):\n        self.assertIn("<blockquote>", to_html("> hi"))\n\n\nif __name__ == "__main__":\n    unittest.main()\n',
            },
        ],
        likes: ["carol", "erin"],
        favorites: ["alice"],
        comments: [
            { username: "carol", content: "表格支持很实用，改编得比我原版还好。", created_at: "2026-08-05 09:30:00" },
        ],
    },
    {
        username: "erin",
        title: "JWT 密钥管理脚本",
        description: "演示如何用 cryptography 安全地生成、轮换与校验 JWT 签名密钥。",
        created_at: "2026-08-05 10:00:00",
        files: [
            {
                name: "jwt_keys.py",
                content:
                    'import base64\n\nfrom cryptography.hazmat.primitives import serialization\nfrom cryptography.hazmat.primitives.asymmetric import ed25519\n\n\ndef generate_keypair() -> tuple[bytes, bytes]:\n    private = ed25519.Ed25519PrivateKey.generate()\n    pub = private.public_key().public_bytes(\n        serialization.Encoding.Raw, serialization.PublicFormat.Raw\n    )\n    return private.private_bytes_raw(), pub\n\n\ndef b64url(data: bytes) -> str:\n    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()\n\n\ndef main() -> None:\n    priv, pub = generate_keypair()\n    print("private (keep secret):", b64url(priv))\n    print("public (for verify):  ", b64url(pub))\n    print("refresh on a schedule; rotate immediately if leaked")\n\n\nif __name__ == "__main__":\n    main()\n',
            },
            {
                name: "requirements.txt",
                content: "cryptography>=42.0\n",
            },
        ],
        likes: ["bob"],
        favorites: ["carol"],
        comments: [
            {
                username: "bob",
                content: "Ed25519 比 RSA 轻量，配合短时 JWT 很合适。",
                created_at: "2026-08-05 11:00:00",
            },
        ],
    },
    {
        username: "erin",
        title: "Go 并发求和",
        description: "用 goroutine + channel 对 1..1000 并发求和，演示 Go 并发基础用法。",
        created_at: "2026-08-06 09:00:00",
        files: [
            {
                name: "main.go",
                content:
                    'package main\n\nimport (\n\t"fmt"\n\t"sync"\n)\n\nfunc main() {\n\tnums := make([]int, 1000)\n\tfor i := range nums {\n\t\tnums[i] = i + 1\n\t}\n\n\tconst workers = 8\n\tchunk := len(nums) / workers\n\tresults := make(chan int, workers)\n\tvar wg sync.WaitGroup\n\n\tfor w := 0; w < workers; w++ {\n\t\twg.Add(1)\n\t\tgo func(w int) {\n\t\t\tdefer wg.Done()\n\t\t\tlo := w * chunk\n\t\t\thi := lo + chunk\n\t\t\tif w == workers-1 {\n\t\t\t\thi = len(nums)\n\t\t\t}\n\t\t\tsum := 0\n\t\t\tfor _, n := range nums[lo:hi] {\n\t\t\t\tsum += n\n\t\t\t}\n\t\t\tresults <- sum\n\t\t}(w)\n\t}\n\n\twg.Wait()\n\tclose(results)\n\ttotal := 0\n\tfor s := range results {\n\t\ttotal += s\n\t}\n\tfmt.Printf("1..1000 并发求和 = %d\\n", total)\n}\n',
            },
        ],
        likes: ["dave", "alice"],
        favorites: ["bob"],
        comments: [
            {
                username: "dave",
                content: "channel 收尾很干净，可以试试 sync.Map 的对比。",
                created_at: "2026-08-06 09:30:00",
                liked_by: ["erin"],
            },
        ],
    },
    {
        username: "dave",
        title: "C 单链表练习",
        description: "用 malloc 手写单链表：尾插、遍历打印与手动释放，演示 C 内存管理。",
        created_at: "2026-08-06 14:00:00",
        files: [
            {
                name: "main.c",
                content:
                    '#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct node {\n    int value;\n    struct node *next;\n} Node;\n\nNode *append(Node *head, int value) {\n    Node *node = malloc(sizeof(Node));\n    if (!node) return head;\n    node->value = value;\n    node->next = NULL;\n    if (!head) return node;\n    Node *cur = head;\n    while (cur->next) cur = cur->next;\n    cur->next = node;\n    return head;\n}\n\nvoid print_list(const Node *head) {\n    for (const Node *cur = head; cur; cur = cur->next) {\n        printf("%d%s", cur->value, cur->next ? " -> " : "\\n");\n    }\n}\n\nvoid free_list(Node *head) {\n    while (head) {\n        Node *next = head->next;\n        free(head);\n        head = next;\n    }\n}\n\nint main(void) {\n    Node *head = NULL;\n    for (int i = 1; i <= 5; i++) head = append(head, i * 10);\n    print_list(head);\n    free_list(head);\n    return 0;\n}\n',
            },
        ],
        likes: ["carol"],
        favorites: ["erin"],
        comments: [
            {
                username: "carol",
                content: "记得检查 malloc 返回值，这个例子做得很规范。",
                created_at: "2026-08-06 14:20:00",
            },
        ],
    },
];

const seedWorkDrafts: SeedWorkDraft[] = [
    {
        username: "alice",
        title: "Python 网络爬虫骨架（草稿）",
        description: "还没写完的爬虫骨架，先存草稿，后续再补解析与存储。",
        files: [
            {
                name: "crawler.py",
                content:
                    'import argparse\nimport sys\n\n\ndef fetch(url: str) -> str:\n    # TODO: 用 requests 拉取页面，还没写完\n    raise NotImplementedError("待实现")\n\n\ndef main() -> int:\n    parser = argparse.ArgumentParser(description="极简爬虫骨架")\n    parser.add_argument("url")\n    args = parser.parse_args()\n    print(f"准备抓取: {args.url}")\n    # TODO: 解析与存储尚未完成\n    return 0\n\n\nif __name__ == "__main__":\n    sys.exit(main())\n',
            },
        ],
    },
    {
        username: "erin",
        title: "Go 猜数字游戏（草稿）",
        description: "一个交互式猜数字小游戏的草稿。",
        files: [
            {
                name: "main.go",
                content:
                    'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"math/rand"\n\t"os"\n\t"strconv"\n\t"strings"\n)\n\nfunc main() {\n\ttarget := rand.Intn(100) + 1\n\tfmt.Println("猜一个 1..100 的数字:")\n\tscanner := bufio.NewScanner(os.Stdin)\n\tfor tries := 1; scanner.Scan(); tries++ {\n\t\tn, err := strconv.Atoi(strings.TrimSpace(scanner.Text()))\n\t\tif err != nil {\n\t\t\tfmt.Println("输入无效，请输入整数")\n\t\t\tcontinue\n\t\t}\n\t\tif n < target {\n\t\t\tfmt.Println("太小了，再试:")\n\t\t} else if n > target {\n\t\t\tfmt.Println("太大了，再试:")\n\t\t} else {\n\t\t\tfmt.Printf("猜对了！用了 %d 次\\n", tries)\n\t\t\treturn\n\t\t}\n\t}\n}\n',
            },
        ],
    },
];

const reset = process.argv.includes("--reset");

function fileExtension(filename: string): string {
    const dot = filename.lastIndexOf(".");
    if (dot < 1 || dot === filename.length - 1) return "txt";
    const ext = filename.slice(dot + 1);
    return /^[a-zA-Z0-9]{1,8}$/.test(ext) ? ext : "txt";
}

async function writeSeedFile(file: SeedFile): Promise<{ name: string; path: string; size: number }> {
    const base = crypto.randomUUID();
    const ext = fileExtension(file.name);
    const relPath = `${base}.${ext}`;
    const bytes = new TextEncoder().encode(file.content);
    await Bun.write(`./uploads/${relPath}`, bytes);
    return { name: file.name, path: `/uploads/${relPath}`, size: bytes.length };
}

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

function crc32(buf: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function adler32(data: Uint8Array): number {
    let a = 1;
    let b = 0;
    for (const byte of data) {
        a = (a + byte) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}

function zlibStream(raw: Uint8Array<ArrayBuffer>): Uint8Array {
    // PNG IDAT 必须是 zlib 格式（RFC 1950）：0x78 头 + deflate 流 + adler32 校验
    const deflated = new Uint8Array(Bun.deflateSync(raw, { level: 9 }));
    const out = new Uint8Array(2 + deflated.length + 4);
    out[0] = 0x78;
    out[1] = 0x01;
    out.set(deflated, 2);
    const adler = adler32(raw);
    const dv = new DataView(out.buffer);
    dv.setUint32(out.length - 4, adler);
    return out;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    let offset = 0;
    dv.setUint32(offset, data.length);
    offset += 4;
    out.set(new TextEncoder().encode(type), offset);
    offset += 4;
    out.set(data, offset);
    offset += data.length;
    dv.setUint32(offset, crc32(out.slice(4, offset)));
    return out;
}

function solidPng(width: number, height: number, color: [number, number, number]): Uint8Array {
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = new Uint8Array(13);
    const dv = new DataView(ihdr.buffer);
    dv.setUint32(0, width);
    dv.setUint32(4, height);
    ihdr[8] = 8;
    ihdr[9] = 2;
    const scanline = width * 3;
    const raw = new Uint8Array(height * (scanline + 1));
    for (let y = 0; y < height; y++) {
        const start = y * (scanline + 1);
        raw[start] = 0;
        for (let x = 0; x < width; x++) {
            const i = start + 1 + x * 3;
            raw[i] = color[0];
            raw[i + 1] = color[1];
            raw[i + 2] = color[2];
        }
    }
    const idat = zlibStream(raw);
    const parts = [signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", new Uint8Array(0))];
    const total = parts.reduce((acc, p) => acc + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

const COVER_COLORS: [number, number, number][] = [
    [244, 164, 96],
    [106, 153, 78],
    [133, 193, 233],
    [186, 104, 200],
    [231, 76, 60],
    [250, 200, 90],
    [102, 51, 153],
];

async function writeSeedCover(index: number): Promise<string> {
    const base = crypto.randomUUID();
    const relPath = `${base}.webp`;
    const color = COVER_COLORS[index % COVER_COLORS.length]!;
    const png = solidPng(1280, 853, color);
    const webp = await new Bun.Image(png).webp({ quality: 60 }).bytes();
    await Bun.write(`./uploads/${relPath}`, webp);
    return `/uploads/${relPath}`;
}

async function deleteUploadedFiles(): Promise<number> {
    const paths = [
        ...db
            .select({ path: workFiles.path })
            .from(workFiles)
            .all()
            .map((r) => r.path),
        ...db
            .select({ path: workDraftFiles.path })
            .from(workDraftFiles)
            .all()
            .map((r) => r.path),
        ...db
            .select({ cover: works.cover })
            .from(works)
            .all()
            .map((r) => r.cover)
            .filter((p) => p.startsWith("/uploads/")),
        ...db
            .select({ cover: workDrafts.cover })
            .from(workDrafts)
            .all()
            .map((r) => r.cover)
            .filter((p) => p.startsWith("/uploads/")),
    ];
    let removed = 0;
    for (const path of paths) {
        try {
            await Bun.file(path.replace(/^\//, "")).unlink();
            removed += 1;
        } catch {}
    }
    return removed;
}

async function main() {
    const usersById = new Map<string, number>();
    const userIds = mainDb
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(inArray(users.username, SAMPLE_USERNAMES))
        .all();
    for (const u of userIds) usersById.set(u.username, u.id);

    if (reset) {
        const removed = await deleteUploadedFiles();
        db.delete(workCommentLikes).run();
        db.delete(workComments).run();
        db.delete(workFavorites).run();
        db.delete(workLikes).run();
        db.delete(workDraftFiles).run();
        db.delete(workDrafts).run();
        db.delete(workFiles).run();
        db.delete(works).run();
        console.log(`已清空作品数据（含 ${removed} 个磁盘文件）`);
    }

    const workIdByKey = new Map<string, number>();
    for (const row of db.select({ id: works.id, user_id: works.user_id, title: works.title }).from(works).all()) {
        workIdByKey.set(`${row.user_id}:${row.title}`, row.id);
    }

    const draftIdByKey = new Map<string, number>();
    for (const row of db
        .select({ id: workDrafts.id, user_id: workDrafts.user_id, title: workDrafts.title })
        .from(workDrafts)
        .all()) {
        draftIdByKey.set(`${row.user_id}:${row.title}`, row.id);
    }

    let worksCount = 0;
    let filesCount = 0;
    let commentsCount = 0;
    let adaptCount = 0;
    let draftsCount = 0;

    for (let wi = 0; wi < seedWorks.length; wi++) {
        const seed = seedWorks[wi]!;
        const userId = usersById.get(seed.username) ?? null;
        if (userId == null) {
            console.warn(`用户 ${seed.username} 不存在，跳过该作品「${seed.title}」（请先运行 bun run seed）`);
            continue;
        }

        let parentId: number | null = null;
        if (seed.parent_key) {
            const [parentUser, ...parentTitle] = seed.parent_key.split(":");
            const puid = usersById.get(parentUser ?? "");
            if (puid != null) {
                parentId = workIdByKey.get(`${puid}:${parentTitle.join(":")}`) ?? null;
            }
            if (parentId != null) adaptCount += 1;
        }

        const key = `${userId}:${seed.title}`;
        if (workIdByKey.has(key)) {
            workIdByKey.set(seed.parent_key ?? key, workIdByKey.get(key)!);
            continue;
        }

        const cover = await writeSeedCover(wi);
        const work = db
            .insert(works)
            .values({
                user_id: userId,
                title: seed.title,
                description: seed.description,
                cover,
                parent_id: parentId,
                created_at: seed.created_at,
                updated_at: seed.created_at,
            })
            .returning()
            .get();
        workIdByKey.set(key, work.id);
        worksCount += 1;

        for (const file of seed.files) {
            const stored = await writeSeedFile(file);
            db.insert(workFiles)
                .values({ work_id: work.id, ...stored })
                .run();
            filesCount += 1;
        }

        for (const uname of seed.likes) {
            const uid = usersById.get(uname);
            if (uid == null) continue;
            db.insert(workLikes)
                .values({ work_id: work.id, user_id: uid, created_at: seed.created_at })
                .onConflictDoNothing()
                .run();
        }
        for (const uname of seed.favorites) {
            const uid = usersById.get(uname);
            if (uid == null) continue;
            db.insert(workFavorites)
                .values({ work_id: work.id, user_id: uid, created_at: seed.created_at })
                .onConflictDoNothing()
                .run();
        }
        for (const comment of seed.comments) {
            const uid = usersById.get(comment.username);
            if (uid == null) continue;
            let parentCommentId: number | null = null;
            if (comment.parent_content) {
                const parent = db
                    .select({ id: workComments.id })
                    .from(workComments)
                    .where(
                        sql`${workComments.work_id} = ${work.id} AND ${workComments.content} = ${comment.parent_content}`,
                    )
                    .get();
                parentCommentId = parent?.id ?? null;
            }
            const row = db
                .insert(workComments)
                .values({
                    work_id: work.id,
                    user_id: uid,
                    content: comment.content,
                    created_at: comment.created_at,
                    parent_id: parentCommentId ?? undefined,
                })
                .returning({ id: workComments.id })
                .get();
            commentsCount += 1;
            for (const liker of comment.liked_by ?? []) {
                const likerId = usersById.get(liker);
                if (likerId == null || row == null) continue;
                db.insert(workCommentLikes)
                    .values({ work_comment_id: row.id, user_id: likerId, created_at: comment.created_at })
                    .onConflictDoNothing()
                    .run();
            }
        }
    }

    for (let di = 0; di < seedWorkDrafts.length; di++) {
        const seed = seedWorkDrafts[di]!;
        const userId = usersById.get(seed.username) ?? null;
        if (userId == null) {
            console.warn(`用户 ${seed.username} 不存在，跳过该草稿「${seed.title}」`);
            continue;
        }
        const key = `${userId}:${seed.title}`;
        if (draftIdByKey.has(key)) continue;
        const cover = await writeSeedCover(di + seedWorks.length);
        const draft = db
            .insert(workDrafts)
            .values({ user_id: userId, title: seed.title, description: seed.description, cover })
            .returning()
            .get();
        draftIdByKey.set(key, draft.id);
        draftsCount += 1;
        for (const file of seed.files) {
            const stored = await writeSeedFile(file);
            db.insert(workDraftFiles)
                .values({ draft_id: draft.id, ...stored })
                .run();
        }
    }

    const [likeTotal, favTotal] = db.get(
        sql`SELECT
            (SELECT COUNT(*) FROM work_likes) AS likes,
            (SELECT COUNT(*) FROM work_favorites) AS favorites`,
    ) as [number, number];
    console.log(
        `插入作品 ${worksCount} 个（含 ${adaptCount} 条改编 / ${filesCount} 个文件）、草稿 ${draftsCount} 个，评论 ${commentsCount} 条。`,
    );
    console.log(`点赞 ${likeTotal} 条，收藏 ${favTotal} 条。`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
