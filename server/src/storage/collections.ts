export const C = {
    users: "users",
    posts: "posts",
    postImages: "post_images",
    tags: "tags",
    postTags: "post_tags",
    favorites: "favorites",
    likes: "likes",
    comments: "comments",
    commentLikes: "comment_likes",
    follows: "follows",
    notifications: "notifications",
    drafts: "drafts",
    draftImages: "draft_images",
    draftTags: "draft_tags",
    works: "works",
    worksLikes: "works_likes",
    worksComments: "works_comments",
    worksCommentLikes: "works_comment_likes",
    coinTransactions: "coin_transactions",
} as const;

export type CollectionName = keyof typeof C;
