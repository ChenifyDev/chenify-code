import type { WorkSummary } from "@/lib/api.ts";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ArrowUpRightIcon, BookmarkIcon, HeartIcon, MessageCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { Link } from "react-router-dom";

export const WorkCard = ({ work }: { work: WorkSummary }) => {
    return (
        <Card key={work.id}>
            <img alt={work.title} src={work.cover} />
            <CardHeader>
                <CardTitle className={"cursor-pointer"} onClick={() => alert("这里什么都没有（")}>
                    {work.title}
                </CardTitle>
                <CardDescription>{work.description}</CardDescription>
            </CardHeader>
            <CardFooter>
                <Badge
                    render={
                        <Link target={"_blank"} to={`/users/${work.author.id}`}>
                            {work.author.username}
                            <ArrowUpRightIcon data-icon="inline-end" />
                        </Link>
                    }
                />

                <CardAction>
                    <Badge>
                        <HeartIcon className={cn("size-3.5", work.is_liked && "fill-current")} /> {work.likes_count}
                    </Badge>
                    <Badge>
                        <BookmarkIcon className={cn("size-3.5", work.is_favorited && "fill-current")} />{" "}
                        {work.favorites_count}
                    </Badge>
                    <Badge>
                        <MessageCircleIcon className={"size-3.5"} /> {work.comments_count}
                    </Badge>
                </CardAction>
            </CardFooter>
        </Card>
    );
};
