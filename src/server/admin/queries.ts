import { desc, eq, like } from "drizzle-orm";
import { db } from "../db";
import { deliveryFeeMnt, user } from "../db/schema";
import { env } from "../lib/env";
import { ConflictError, NotFoundError } from "../lib/errors";

export type AdminSettingsStatus = {
  deliveryFee: number;
  qpayConfigured: boolean;
  smsConfigured: boolean;
  posthogConfigured: boolean;
  aiSearchConfigured: boolean;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export const adminSettingsQueries = {
  getSettings(): AdminSettingsStatus {
    return {
      deliveryFee: deliveryFeeMnt,
      qpayConfigured: Boolean(
        env.QPAY_URL && env.QPAY_USERNAME && env.QPAY_PASSWORD && env.QPAY_INVOICE_CODE,
      ),
      smsConfigured: Boolean(
        env.SMS_GATEWAY_BASE_URL && env.SMS_GATEWAY_LOGIN && env.SMS_GATEWAY_PASSWORD,
      ),
      posthogConfigured: Boolean(env.POSTHOG_KEY && env.POSTHOG_PROJECT_ID),
      aiSearchConfigured: Boolean(env.AI_SEARCH_INDEX_ID),
    };
  },

  async listUsers(): Promise<AdminUserRow[]> {
    // Bounded result set — without an explicit LIMIT the no-search
    // path selects every user row, which is unbounded as the user
    // table grows. 50 matches the search path's cap.
    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      })
      .from(user)
      .orderBy(desc(user.isAdmin), desc(user.createdAt))
      .limit(50);
    return rows;
  },

  async searchUsersByEmail(emailQuery: string): Promise<AdminUserRow[]> {
    // Escape LIKE wildcards in the user input so `%` and `_` in the
    // search string are matched literally, not as pattern metacharacters.
    // Without this, searching for "100%" would match every email.
    const escaped = emailQuery.replace(/[%_\\]/g, "\\$&");
    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      })
      .from(user)
      .where(like(user.email, `%${escaped}%`))
      .orderBy(desc(user.isAdmin), desc(user.createdAt))
      .limit(50);
    return rows;
  },

  async updateIsAdmin(
    targetId: string,
    nextIsAdmin: boolean,
    currentUserId: string,
  ): Promise<AdminUserRow> {
    if (targetId === currentUserId) {
      throw new ConflictError("Cannot modify your own admin flag.");
    }

    // Atomic update + read in one statement via `.returning()`. The
    // previous code did a SELECT → UPDATE → SELECT (3 round trips) and
    // could observe a stale row between the UPDATE and the final SELECT.
    const [updated] = await db
      .update(user)
      .set({ isAdmin: nextIsAdmin, updatedAt: new Date() })
      .where(eq(user.id, targetId))
      .returning({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      });

    if (!updated) {
      throw new NotFoundError("user", targetId);
    }

    return updated;
  },
};
