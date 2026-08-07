import { asc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { draftTags, postTags, tags } from "./schema";

export function listTags(): string[] {
    const rows = db
        .select({ name: tags.name })
        .from(tags)
        .orderBy(asc(tags.name))
        .all();
    return rows.map((row) => row.name);
}

export function getOrCreateTag(name: string): number | undefined {
    db.insert(tags).values({ name }).onConflictDoNothing().run();
    return db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.name, name))
        .get()?.id;
}

export function isTagReferenced(tagId: number): boolean {
    const postsUsed = db
        .select({ one: sql`1` })
        .from(postTags)
        .where(eq(postTags.tag_id, tagId))
        .limit(1)
        .get();
    if (postsUsed) return true;
    const draftsUsed = db
        .select({ one: sql`1` })
        .from(draftTags)
        .where(eq(draftTags.tag_id, tagId))
        .limit(1)
        .get();
    return draftsUsed != null;
}

export function deleteTag(tagId: number): void {
    db.delete(tags).where(eq(tags.id, tagId)).run();
}