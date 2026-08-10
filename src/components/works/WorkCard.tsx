import type { WorkSummary } from "@/lib/api.ts";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Code2, HeartIcon } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";

export const WorkCard = ({ work, className }: { work: WorkSummary; className?: string }) => {
    const user = work.author;
    const navigate = useNavigate();
    return (
        <Card key={work.id} className={`relative overflow-hidden ${className || ""}`}>
            <img
                className={"cursor-pointer"}
                alt={work.title}
                src={work.cover}
                onClick={() => alert("这里什么都没有（")}
            />

            <CardHeader>
                <CardTitle className={"cursor-pointer"} onClick={() => alert("这里什么都没有（")}>
                    {work.title}
                </CardTitle>
                <CardDescription className="mt-2">{work.description}</CardDescription>
            </CardHeader>

            <CardFooter className="flex justify-between items-center">
                <Link target="_blank" to={`/users/${work.author.id}`} className="flex gap-2 items-center">
                    <Avatar
                        size={"sm"}
                        onClick={() => navigate(`/users/${user?.id}`)}
                        className={cn("shrink-0", user && "cursor-pointer")}
                    >
                        {user?.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : null}
                        <AvatarFallback>{user ? user.username.slice(0, 2) : <Code2 />}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{work.author.username}</span>
                </Link>

                <div className="flex items-center gap-1">
                    <HeartIcon className={cn("size-4", work.is_liked && "fill-current")} />
                    <span className="text-sm">{work.likes_count}</span>
                </div>
            </CardFooter>
        </Card>
    );
};
