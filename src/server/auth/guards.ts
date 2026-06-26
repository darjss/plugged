import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { account } from "../db/schema";
import { isApprovedAdminAccount } from "./admin";

export async function isAdminUser(userId: string) {
  const rows = await getDb()
    .select({ accountId: account.accountId })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1);

  return isApprovedAdminAccount(rows[0]?.accountId);
}
