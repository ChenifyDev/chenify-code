import { FileText } from "lucide-react";
import { useUserStore } from "@/stores/useUser.ts";
import PostDraftList from "@/components/forum/drafts/DraftList.tsx";

export default function Drafts() {
    const me = useUserStore((s) => s.user);

    if (!me) return null;

    return (
        <div className="mx-auto w-full p-4 md:p-6">
            <header className="mb-4">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <FileText className="size-5" />
                    草稿管理
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">管理你的未发布内容和已发布的文章</p>
            </header>

            <PostDraftList />
        </div>
    );
}
