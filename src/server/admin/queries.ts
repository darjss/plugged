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

export const adminQueries = {
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
    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      })
      .from(user)
      .orderBy(desc(user.isAdmin), desc(user.createdAt));
    return rows;
  },

  async searchUsersByEmail(emailQuery: string): Promise<AdminUserRow[]> {
    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      })
      .from(user)
      .where(like(user.email, `%${emailQuery}%`))
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

    const target = await db
      .select({ id: user.id, isAdmin: user.isAdmin })
      .from(user)
      .where(eq(user.id, targetId))
      .limit(1);

    if (!target[0]) {
      throw new NotFoundError("user", targetId);
    }

    await db
      .update(user)
      .set({ isAdmin: nextIsAdmin, updatedAt: new Date() })
      .where(eq(user.id, targetId));

    const updated = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      })
      .from(user)
      .where(eq(user.id, targetId))
      .limit(1);

    if (!updated[0]) {
      throw new NotFoundError("user", targetId);
    }

    return updated[0];
  },
};
