import { C } from "../collections";
import { loadContentBlob } from "../content";
import { buildPosts } from "../mappers";
import type { HomeRepo } from "../plugin";
import type { BlobStore, CollectionStore } from "../store";
import type {
    StoredCoinTransaction,
    StoredComment,
    StoredFavorite,
    StoredFollow,
    StoredLike,
    StoredPost,
    StoredPostImage,
    StoredPostTag,
    StoredTag,
    StoredUser,
} from "../rows";
import type { Post, PostRow } from "../types";

async function boardViewerFollowingsPosts(
    store: CollectionStore,
    blobStore: BlobStore,
    viewerId: number | null,
): Promise<PostRow[]> {
    if (viewerId == null) return [];

    const [posts, users, comments, likes, favorites, follows, coins] = await Promise.all([
        store.read<StoredPost>(C.posts),
        store.read<StoredUser>(C.users),
        store.read<StoredComment>(C.comments),
        store.read<StoredLike>(C.likes),
        store.read<StoredFavorite>(C.favorites),
        store.read<StoredFollow>(C.follows),
        store.read<StoredCoinTransaction>(C.coinTransactions),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const followingIds = new Set(follows.filter((row) => row.follower_id === viewerId).map((row) => row.following_id));
    const coinsCount = (postId: number) =>
        coins.reduce((sum, row) => (row.post_id === postId && row.type === "tip_in" ? sum + row.amount : sum), 0);

    return posts
        .filter((post) => followingIds.has(post.user_id))
        .map((post) => {
            const author = userMap.get(post.user_id);
            return {
                id: post.id,
                user_id: post.user_id,
                content: "",
                contentRef: post.content,
                created_at: post.created_at,
                username: author?.username ?? "未知用户",
                avatar: author?.avatar ?? null,
                comments_count: comments.filter((comment) => comment.post_id === post.id).length,
                likes_count: likes.filter((like) => like.post_id === post.id).length,
                favorites_count: favorites.filter((favorite) => favorite.post_id === post.id).length,
                coins_count: Math.round(coinsCount(post.id) * 10000) / 10000,
                pinned: post.pinned,
            };
        });
}

async function loadPageContent(blobStore: BlobStore, rows: PostRow[]): Promise<void> {
    await Promise.all(
        rows.map(async (row) => {
            row.content = await loadContentBlob(blobStore, row.contentRef);
        }),
    );
}

async function hydrateViewerFollowingsPosts(
    store: CollectionStore,
    rows: PostRow[],
    viewerId: number | null,
): Promise<Post[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const authorIds = [...new Set(rows.map((row) => row.user_id))];
    const [images, tags, postTags, allFavorites, allLikes, allFollows] = await Promise.all([
        store.read<StoredPostImage>(C.postImages),
        store.read<StoredTag>(C.tags),
        store.read<StoredPostTag>(C.postTags),
        store.read<StoredFavorite>(C.favorites),
        store.read<StoredLike>(C.likes),
        store.read<StoredFollow>(C.follows),
    ]);

    const imageMap = new Map<number, string[]>();
    for (const row of images) {
        if (!ids.includes(row.post_id)) continue;
        const list = imageMap.get(row.post_id) ?? [];
        list.push(row.path);
        imageMap.set(row.post_id, list);
    }

    const tagNameMap = new Map(tags.map((tag) => [tag.id, tag.name]));
    const tagMap = new Map<number, string[]>();
    for (const row of postTags) {
        if (!ids.includes(row.post_id)) continue;
        const list = tagMap.get(row.post_id) ?? [];
        const tagName = tagNameMap.get(row.tag_id);
        if (tagName) list.push(tagName);
        tagMap.set(row.post_id, list);
    }

    const favorited = new Set<number>();
    const liked = new Set<number>();
    if (viewerId != null) {
        for (const row of allFavorites) {
            if (row.user_id === viewerId && ids.includes(row.post_id)) favorited.add(row.post_id);
        }
        for (const row of allLikes) {
            if (row.user_id === viewerId && ids.includes(row.post_id)) liked.add(row.post_id);
        }
    }

    const followedAuthors = new Set<number>();
    if (viewerId != null) {
        for (const row of allFollows) {
            if (row.follower_id === viewerId && authorIds.includes(row.following_id)) {
                followedAuthors.add(row.following_id);
            }
        }
    }

    return buildPosts(rows, {
        images: imageMap,
        tags: tagMap,
        favoritedIds: favorited,
        likedIds: liked,
        followedAuthorIds: followedAuthors,
    });
}

export async function listViewerFollowingPosts(
    store: CollectionStore,
    blobStore: BlobStore,
    viewerId: number | null,
    options: { offset?: number; limit?: number } = {},
): Promise<Post[]> {
    const { offset = 0, limit = 20 } = options;
    if (viewerId == null) return [];

    let rows = await boardViewerFollowingsPosts(store, blobStore, viewerId);
    rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    const page = rows.slice(offset, offset + limit);
    await loadPageContent(blobStore, page);
    return hydrateViewerFollowingsPosts(store, page, viewerId);
}

export const getViewerFollowingsPosts = listViewerFollowingPosts;

export async function countViewerFollowingPosts(store: CollectionStore, viewerId: number): Promise<number> {
    const follows = await store.read<StoredFollow>(C.follows);
    const followingIds = new Set(follows.filter((row) => row.follower_id === viewerId).map((row) => row.following_id));
    if (followingIds.size === 0) return 0;

    const posts = await store.read<StoredPost>(C.posts);
    return posts.filter((post) => followingIds.has(post.user_id)).length;
}

export function createHomeRepo(store: CollectionStore, blobStore: BlobStore): HomeRepo {
    return {
        async listFollowingPosts(viewerId, options) {
            return listViewerFollowingPosts(store, blobStore, viewerId, options);
        },
        async countFollowingPosts(viewerId) {
            return countViewerFollowingPosts(store, viewerId);
        },
    };
}
