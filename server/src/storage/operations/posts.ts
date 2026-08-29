import { C } from "../collections";
import { deleteContentBlob, loadContentBlob, saveContentBlob } from "../content";
import type { BlobStore, CollectionStore } from "../store";
import type {
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
import { deleteTag, getOrCreateTag, isTagReferenced } from "./tags-internal";
import { deleteComments } from "./comments";
import { deleteNotificationsForPost } from "./notifications";
import { buildPosts, heatPost, type PostHydrationContext } from "../mappers";
import type { Post, PostRow } from "../types";
import type { PostsRepo } from "../plugin";

async function boardPosts(
    store: CollectionStore,
    blobStore: BlobStore,
    loadContent = false,
): Promise<PostRow[]> {
    const [posts, users, comments, likes, favorites] = await Promise.all([
        store.read<StoredPost>(C.posts),
        store.read<StoredUser>(C.users),
        store.read<StoredComment>(C.comments),
        store.read<StoredLike>(C.likes),
        store.read<StoredFavorite>(C.favorites),
    ]);
    const userMap = new Map(users.map((user) => [user.id, user]));
    const contentOf = loadContent
        ? (post: StoredPost) => loadContentBlob(blobStore, post.content)
        : () => Promise.resolve("");
    return Promise.all(
        posts.map(async (post) => {
            const author = userMap.get(post.user_id);
            return {
                id: post.id,
                user_id: post.user_id,
                content: await contentOf(post),
                contentRef: post.content,
                created_at: post.created_at,
                username: author?.username ?? "未知用户",
                avatar: author?.avatar ?? null,
                comments_count: comments.filter((c) => c.post_id === post.id).length,
                likes_count: likes.filter((l) => l.post_id === post.id).length,
                favorites_count: favorites.filter((f) => f.post_id === post.id).length,
                pinned: post.pinned,
            };
        }),
    );
}

async function loadRowsContent(blobStore: BlobStore, rows: PostRow[]): Promise<void> {
    await Promise.all(
        rows.map(async (row) => {
            row.content = await loadContentBlob(blobStore, row.contentRef);
        }),
    );
}

async function postIdsWithTag(store: CollectionStore, tag: string): Promise<Set<number>> {
    const [tags, postTags] = await Promise.all([
        store.read<StoredTag>(C.tags),
        store.read<StoredPostTag>(C.postTags),
    ]);
    const tagId = tags.find((t) => t.name === tag)?.id;
    const ids = new Set<number>();
    if (tagId != null) {
        for (const row of postTags) if (row.tag_id === tagId) ids.add(row.post_id);
    }
    return ids;
}

async function hydratePosts(store: CollectionStore, rows: PostRow[], viewerId: number | null): Promise<Post[]> {
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
        const arr = imageMap.get(row.post_id) ?? [];
        arr.push(row.path);
        imageMap.set(row.post_id, arr);
    }

    const tagNameMap = new Map(tags.map((tag) => [tag.id, tag.name]));
    const tagMap = new Map<number, string[]>();
    for (const row of postTags) {
        if (!ids.includes(row.post_id)) continue;
        const arr = tagMap.get(row.post_id) ?? [];
        const name = tagNameMap.get(row.tag_id);
        if (name) arr.push(name);
        tagMap.set(row.post_id, arr);
    }

    const favorited = new Set<number>();
    const liked = new Set<number>();
    if (viewerId != null) {
        for (const row of allFavorites)
            if (row.user_id === viewerId && ids.includes(row.post_id)) favorited.add(row.post_id);
        for (const row of allLikes) if (row.user_id === viewerId && ids.includes(row.post_id)) liked.add(row.post_id);
    }
    const followedAuthors = new Set<number>();
    if (viewerId != null) {
        for (const row of allFollows)
            if (row.follower_id === viewerId && authorIds.includes(row.following_id))
                followedAuthors.add(row.following_id);
    }

    const ctx: PostHydrationContext = {
        images: imageMap,
        tags: tagMap,
        favoritedIds: favorited,
        likedIds: liked,
        followedAuthorIds: followedAuthors,
    };
    return buildPosts(rows, ctx);
}

export async function getPostByIdStandalone(
    store: CollectionStore,
    blobStore: BlobStore,
    id: number,
    viewerId: number | null,
): Promise<Post | null> {
    const rows = await boardPosts(store, blobStore);
    const row = rows.find((r) => r.id === id);
    if (!row) return null;
    await loadRowsContent(blobStore, [row]);
    return (await hydratePosts(store, [row], viewerId))[0] ?? null;
}

const contentCache = new Map<number, string>();
const CONTENT_CACHE_MAX = 256;

function getCachedContent(postId: number): string | null {
    const content = contentCache.get(postId);
    if (content === undefined) return null;
    contentCache.delete(postId);
    contentCache.set(postId, content);
    return content;
}

function cacheContent(postId: number, content: string): void {
    if (contentCache.has(postId)) contentCache.delete(postId);
    contentCache.set(postId, content);
    if (contentCache.size > CONTENT_CACHE_MAX) {
        const oldest = contentCache.keys().next().value;
        if (oldest !== undefined) contentCache.delete(oldest);
    }
}

function invalidateContent(postId: number): void {
    contentCache.delete(postId);
}

export async function getPostContentStandalone(
    store: CollectionStore,
    blobStore: BlobStore,
    id: number,
): Promise<string | null> {
    const post = await store.getById<StoredPost>(C.posts, id);
    if (!post) return null;
    const cached = getCachedContent(id);
    if (cached !== null) return cached;
    const content = await loadContentBlob(blobStore, post.content);
    cacheContent(id, content);
    return content;
}

export async function createPostStandalone(
    store: CollectionStore,
    blobStore: BlobStore,
    userId: number,
    content: string,
    imagePaths: string[],
    postTagsNames: string[],
): Promise<Post | null> {
    const contentRef = await saveContentBlob(blobStore, content);
    const post = await store.insert<StoredPost>(C.posts, {
        user_id: userId,
        content: contentRef,
        created_at: new Date().toISOString(),
        pinned: false,
    });
    for (const path of imagePaths) {
        await store.insert<StoredPostImage>(C.postImages, { post_id: post.id, path });
    }
    for (const tag of postTagsNames) {
        const tagId = await getOrCreateTag(store, tag);
        if (tagId == null) continue;
        const existing = await store.read<StoredPostTag>(C.postTags);
        if (existing.some((row) => row.post_id === post.id && row.tag_id === tagId)) continue;
        await store.append<StoredPostTag>(C.postTags, { post_id: post.id, tag_id: tagId });
    }
    return getPostByIdStandalone(store, blobStore, post.id, userId);
}

export async function updatePostContentStandalone(
    store: CollectionStore,
    blobStore: BlobStore,
    postId: number,
    content: string,
): Promise<Post | null> {
    const post = await store.getById<StoredPost>(C.posts, postId);
    if (!post) return null;
    const contentRef = await saveContentBlob(blobStore, content);
    await deleteContentBlob(blobStore, post.content);
    invalidateContent(postId);
    await store.updateById<StoredPost>(C.posts, postId, { content: contentRef });
    return getPostByIdStandalone(store, blobStore, postId, post.user_id);
}

export async function updatePostStandalone(
    store: CollectionStore,
    blobStore: BlobStore,
    postId: number,
    content: string,
    imagePaths: string[],
    postTagsNames: string[],
): Promise<Post | null> {
    const post = await store.getById<StoredPost>(C.posts, postId);
    if (!post) return null;
    const contentRef = await saveContentBlob(blobStore, content);
    await deleteContentBlob(blobStore, post.content);
    invalidateContent(postId);

    const existingTagRows = await store.read<StoredPostTag>(C.postTags);
    const removedTagIds = existingTagRows.filter((row) => row.post_id === postId).map((row) => row.tag_id);

    await Promise.all([
        store.updateById<StoredPost>(C.posts, postId, { content: contentRef }),
        store.deleteWhere<StoredPostImage>(C.postImages, (row) => row.post_id === postId),
        store.deleteWhere<StoredPostTag>(C.postTags, (row) => row.post_id === postId),
    ]);

    const keepTags = new Set(removedTagIds);
    for (const path of imagePaths) {
        await store.insert<StoredPostImage>(C.postImages, { post_id: postId, path });
    }
    for (const tag of postTagsNames) {
        const tagId = await getOrCreateTag(store, tag);
        if (tagId == null) continue;
        keepTags.add(tagId);
        const rows = await store.read<StoredPostTag>(C.postTags);
        if (rows.some((row) => row.post_id === postId && row.tag_id === tagId)) continue;
        await store.append<StoredPostTag>(C.postTags, { post_id: postId, tag_id: tagId });
    }

    for (const tagId of removedTagIds) {
        if (!keepTags.has(tagId) && !(await isTagReferenced(store, tagId))) await deleteTag(store, tagId);
    }

    return getPostByIdStandalone(store, blobStore, postId, post.user_id);
}

async function deletePostRowsOnly(store: CollectionStore, blobStore: BlobStore, id: number): Promise<void> {
    const [comments, posts] = await Promise.all([
        store.read<StoredComment>(C.comments),
        store.read<StoredPost>(C.posts),
    ]);
    const post = posts.find((row) => row.id === id);
    if (post) {
        await deleteContentBlob(blobStore, post.content);
    }
    const commentIds = comments.filter((row) => row.post_id === id).map((row) => row.id);
    await Promise.all([
        store.deleteWhere<StoredPostImage>(C.postImages, (row) => row.post_id === id),
        store.deleteWhere<StoredPostTag>(C.postTags, (row) => row.post_id === id),
        store.deleteWhere<StoredFavorite>(C.favorites, (row) => row.post_id === id),
        store.deleteWhere<StoredLike>(C.likes, (row) => row.post_id === id),
        deleteNotificationsForPost(store, id),
    ]);
    await deleteComments(store, blobStore, commentIds);
    await store.deleteWhere<StoredPost>(C.posts, (row) => row.id === id);
}

export async function deletePostStandalone(
    store: CollectionStore,
    blobStore: BlobStore,
    id: number,
): Promise<string[]> {
    const images = await store.read<StoredPostImage>(C.postImages);
    const paths = images.filter((row) => row.post_id === id).map((row) => row.path);
    invalidateContent(id);
    await deletePostRowsOnly(store, blobStore, id);
    return paths;
}

export async function deletePostRowStandalone(store: CollectionStore, blobStore: BlobStore, id: number): Promise<void> {
    invalidateContent(id);
    await deletePostRowsOnly(store, blobStore, id);
}

export async function setPostPinnedStandalone(
    store: CollectionStore,
    blobStore: BlobStore,
    postId: number,
    pinned: boolean,
): Promise<Post | null> {
    const post = await store.getById<StoredPost>(C.posts, postId);
    if (!post) return null;

    if (pinned) {
        const all = await store.read<StoredPost>(C.posts);
        const others = all.filter((row) => row.user_id === post.user_id && row.id !== postId && row.pinned);
        await Promise.all(others.map((row) => store.updateById<StoredPost>(C.posts, row.id, { pinned: false })));
        if (!post.pinned) await store.updateById<StoredPost>(C.posts, postId, { pinned: true });
    } else if (post.pinned) {
        await store.updateById<StoredPost>(C.posts, postId, { pinned: false });
    }

    return getPostByIdStandalone(store, blobStore, postId, post.user_id);
}

export function createPostsRepo(store: CollectionStore, blobStore: BlobStore): PostsRepo {
    return {
        async getPostOwner(id) {
            const post = await store.getById<StoredPost>(C.posts, id);
            return post?.user_id ?? null;
        },

        async createPost(userId, content, imagePaths, postTagsNames) {
            return createPostStandalone(store, blobStore, userId, content, imagePaths, postTagsNames);
        },

        async getPostById(id, viewerId) {
            return getPostByIdStandalone(store, blobStore, id, viewerId);
        },

        async getPostContent(id) {
            return getPostContentStandalone(store, blobStore, id);
        },

        async listPosts(options) {
            const { offset, limit, tag, viewerId, sort = "latest" } = options;
            let rows = await boardPosts(store, blobStore);

            if (tag != null) {
                const postsWithTag = await postIdsWithTag(store, tag);
                rows = rows.filter((row) => postsWithTag.has(row.id));
            }

            if (sort === "hot") {
                rows = [...rows].sort(
                    (a, b) =>
                        heatPost(b.likes_count, b.favorites_count, b.comments_count, b.created_at) -
                            heatPost(a.likes_count, a.favorites_count, a.comments_count, a.created_at) ||
                        b.created_at.localeCompare(a.created_at) ||
                        b.id - a.id,
                );
            } else {
                rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
            }

            const page = rows.slice(offset, offset + limit);
            await loadRowsContent(blobStore, page);
            return hydratePosts(store, page, viewerId);
        },

        async countPosts({ tag }) {
            let rows = await store.read<StoredPost>(C.posts);
            if (tag != null) {
                const postsWithTag = await postIdsWithTag(store, tag);
                rows = rows.filter((row) => postsWithTag.has(row.id));
            }
            return rows.length;
        },

        async listUserPosts(userId, options) {
            const rows = await boardPosts(store, blobStore);
            const filtered = rows
                .filter((row) => row.user_id === userId)
                .sort(
                    (a, b) =>
                        Number(b.pinned) - Number(a.pinned) ||
                        b.created_at.localeCompare(a.created_at) ||
                        b.id - a.id,
                );
            const page = filtered.slice(options.offset, options.offset + options.limit);
            await loadRowsContent(blobStore, page);
            return hydratePosts(store, page, options.viewerId);
        },

        async countUserPosts(userId) {
            const rows = await store.read<StoredPost>(C.posts);
            return rows.filter((row) => row.user_id === userId).length;
        },

        async listUserFavorites(userId, options) {
            const [favorites, rows] = await Promise.all([
                store.read<StoredFavorite>(C.favorites),
                boardPosts(store, blobStore),
            ]);
            const rowMap = new Map(rows.map((row) => [row.id, row]));
            const favorited = favorites
                .filter((fav) => fav.user_id === userId && rowMap.has(fav.post_id))
                .sort((a, b) => b.id - a.id);
            const page = favorited
                .slice(options.offset, options.offset + options.limit)
                .map((fav) => rowMap.get(fav.post_id)!);
            await loadRowsContent(blobStore, page);
            return hydratePosts(store, page, options.viewerId);
        },

        async countUserFavorites(userId) {
            const rows = await store.read<StoredFavorite>(C.favorites);
            return rows.filter((row) => row.user_id === userId).length;
        },

        async updatePostContent(id, content) {
            return updatePostContentStandalone(store, blobStore, id, content);
        },

        async setPostPinned(postId, pinned) {
            return setPostPinnedStandalone(store, blobStore, postId, pinned);
        },

        async deletePost(id) {
            return deletePostStandalone(store, blobStore, id);
        },

        async deletePostRow(id) {
            await deletePostRowsOnly(store, blobStore, id);
        },

        async searchPosts(options) {
            const { offset, limit, keyword, sort = "latest" } = options;
            const kw = keyword.toLowerCase();
            let rows = (await boardPosts(store, blobStore, true)).filter((row) => row.content.toLowerCase().includes(kw));
            if (sort === "hot") {
                rows = [...rows].sort(
                    (a, b) =>
                        heatPost(b.likes_count, b.favorites_count, b.comments_count, b.created_at) -
                            heatPost(a.likes_count, a.favorites_count, a.comments_count, a.created_at) ||
                        b.created_at.localeCompare(a.created_at) ||
                        b.id - a.id,
                );
            } else {
                rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
            }
            return hydratePosts(store, rows.slice(offset, offset + limit), null);
        },

        async countSearchPosts({ keyword }) {
            const kw = keyword.toLowerCase();
            const rows = await boardPosts(store, blobStore, true);
            return rows.filter((row) => row.content.toLowerCase().includes(kw)).length;
        },
    };
}
