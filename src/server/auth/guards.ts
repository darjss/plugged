import { eq } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/schema";

export async function isAdminUser(userId: string) {
  const row = await db
    .select({ isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row[0]?.isAdmin ?? false;
}
