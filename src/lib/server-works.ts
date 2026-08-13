export interface WorkFileMeta {
    id: number;
    name: string;
    path: string;
    size: number;
}

export interface WorkDetail {
    id: number;
    title: string;
    description: string;
    files: WorkFileMeta[];
}

export interface RunnerFile {
    path: string;
    content: string;
}

export interface RunnerWork {
    workId: number;
    title: string;
    files: RunnerFile[];
    main: RunnerFile | null;
}

async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
}

export function fetchWork(workId: number): Promise<WorkDetail> {
    return getJson<WorkDetail>(`/api/works/${workId}`);
}

async function fetchWorkFileContent(path: string): Promise<string> {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
}

const MAIN_CANDIDATES = ["main.py", "main.go", "main.ts", "main.tsx", "main.cpp", "main.c"];

export async function loadWorkForRunner(workId: number): Promise<RunnerWork> {
    const work = await fetchWork(workId);
    const files = await Promise.all(
        work.files.map(async (file) => ({
            path: file.name,
            content: await fetchWorkFileContent(file.path),
        })),
    );
    const main = files.find((file) => MAIN_CANDIDATES.includes(file.path.toLowerCase())) ?? null;
    return { workId: work.id, title: work.title, files, main };
}
