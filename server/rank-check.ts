import { getDb } from "./src/db/client";
import { likes, favorites, posts } from "./src/db/schema";
import { getStorage } from "./src/storage";

const db = getDb();

const storage = getStorage();

const rank = await storage.rank.rankUsersByPoints(1, { offset: 0, limit: 10 });
console.log("points rank:");
for (const r of rank) console.log(`  #${r.rank} ${r.username} points=${r.points} following=${r.is_following}`);
console.log("getPointsRank(1):", await storage.rank.getPointsRank(1));

const postRows = db.select().from(posts).all();
const likeRows = db.select().from(likes).all();
const favRows = db.select().from(favorites).all();
const manual = new Map<number, number>();
for (const p of postRows) {
    const ownLikes = likeRows.filter((l) => l.post_id === p.id).length;
    const ownFavs = favRows.filter((f) => f.post_id === p.id).length;
    manual.set(p.user_id, (manual.get(p.user_id) ?? 0) + ownLikes + 2 * ownFavs);
}
console.log(
    "manual per user:",
    [...manual.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([u, p]) => `${u}:${p}`)
        .join(" "),
);
