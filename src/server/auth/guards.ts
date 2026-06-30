import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { db } from "../db";
import { user } from "../db/schema";

const ADMIN_CACHE_TTL = 300; // 5 minutes
const ADMIN_CACHE_KEY = (userId: string) => `admin:${userId}`;

export async function isAdminUser(userId: string) {
  const cached = await env.CACHE.get(ADMIN_CACHE_KEY(userId));
  if (cached !== null) return cached === "true";

  const row = await db
    .select({ isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const isAdmin = row[0]?.isAdmin ?? false;
  await env.CACHE.put(ADMIN_CACHE_KEY(userId), String(isAdmin), {
    expirationTtl: ADMIN_CACHE_TTL,
  });
  return isAdmin;
}
