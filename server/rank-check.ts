import { db } from "./src/db";
import { rankUsersByPoints, getPointsRank } from "./src/db/rank.ts";
import { likes, favorites, posts } from "./src/db/schema.ts";
import { sql } from "drizzle-orm";

const rows = rankUsersByPoints(1, { offset: 0, limit: 10 });
console.log("points rank:");
for (const r of rows) console.log(`  #${r.rank} ${r.username} points=${r.points} following=${r.is_following}`);
console.log("getPointsRank(1):", getPointsRank(1));

const counts = db
    .select({
        user_id: posts.user_id,
        likes: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.post_id} = ${posts.id})`,
        favs: sql<number>`(SELECT COUNT(*) FROM ${favorites} WHERE ${favorites.post_id} = ${posts.id})`,
    })
    .from(posts)
    .all();
const manual = new Map<number, number>();
for (const c of counts) manual.set(c.user_id, (manual.get(c.user_id) ?? 0) + c.likes + 2 * c.favs);
console.log(
    "manual per user:",
    [...manual.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([u, p]) => `${u}:${p}`)
        .join(" "),
);
