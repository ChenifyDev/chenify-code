import { useState } from "react";
import { FileText } from "lucide-react";
import { useUserStore } from "@/stores/useUser.ts";
import PostDraftList from "@/components/forum/drafts/DraftList.tsx";
import WorkDraftList from "@/components/works/drafts/DraftList.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

type DraftType = "posts" | "works";

export default function Drafts() {
    const [draftType, setDraftType] = useState<DraftType>("posts");

    const me = useUserStore((s) => s.user);

    if (!me) return null;

    return (
        <div className="mx-auto w-full p-4 md:p-6">
            <header className="mb-4">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <FileText className="size-5" />
                    草稿管理{" "}
                    <Tabs
                        defaultValue={"posts"}
                        value={draftType}
                        onValueChange={(value: DraftType) => setDraftType(value)}
                    >
                        <TabsList variant={"line"}>
                            <TabsTrigger value={"posts"}>帖子</TabsTrigger>
                            <TabsTrigger value={"works"}>作品</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">管理你的未发布内容和已发布的文章</p>
            </header>

            {draftType === "posts" ? <PostDraftList /> : <WorkDraftList />}
        </div>
    );
}
