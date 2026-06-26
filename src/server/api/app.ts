import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { adminQueries } from "../commerce/admin-queries";
import { adminQueries as adminSettingsQueries } from "../admin/queries";
import { adminUpdateUserSchema, adminUsersQuerySchema } from "../admin/validation";
import { commerceQueries } from "../commerce/queries";
import {
  cartItemInputSchema,
  checkoutInputSchema,
  createPaymentInputSchema,
} from "../commerce/validation";
import { db } from "../db";
import { order } from "../db/schema";
import { checkQpayInvoice } from "../integrations/qpay";
import { DomainError } from "../lib/errors";
import { authPlugin } from "./plugins/auth";
import { parseInput } from "./validation";

export const app = new Elysia()
  .onError(({ error, status }) => {
    if (error instanceof DomainError) {
      return status(error.status, {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }

    return status(500, {
      error: {
        code: "internal-error",
        message: "Internal server error",
      },
    });
  })
  .use(authPlugin)
  .get("/health", () => ({
    ok: true,
    service: "plugged-api",
  }))
  .get("/me", ({ user }) => ({
    authenticated: Boolean(user),
    user,
  }))
  .get(
    "/dashboard/session",
    ({ isAdmin, session, user }) => ({
      authenticated: true,
      isAdmin,
      session,
      user,
    }),
    {
      requireAdmin: true,
    },
  )
  .get("/admin/stats", () => adminQueries.getStats(), {
    requireAdmin: true,
  })
  .get("/admin/settings", () => adminSettingsQueries.getSettings(), { requireAdmin: true })
  .get(
    "/admin/orders",
    ({ query }) => {
      const raw = query as Record<string, string | undefined>;
      const parsed = Number(raw.limit ?? 10);
      const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 10;
      return adminQueries.getRecentOrders(limit);
    },
    { requireAdmin: true },
  )
  .get(
    "/admin/products",
    ({ query }) => {
      const raw = query as Record<string, string | undefined>;
      if (raw.lowStock !== "true") return { products: [] };
      return adminQueries.getLowStockProducts().then((products) => ({ products }));
    },
    { requireAdmin: true },
  )
  .get(
    "/admin/users",
    async ({ query }) => {
      const input = parseInput(adminUsersQuerySchema, query);
      if (input.search) {
        return { users: await adminSettingsQueries.searchUsersByEmail(input.search) };
      }
      return { users: await adminSettingsQueries.listUsers() };
    },
    { requireAdmin: true },
  )
  .patch(
    "/admin/users/:id",
    async ({ body, params, user }) => {
      const input = parseInput(adminUpdateUserSchema, body);
      return adminSettingsQueries.updateIsAdmin(params.id, input.isAdmin, user!.id);
    },
    { requireAdmin: true },
  )
  .get("/products", async () => ({
    products: await commerceQueries.store.getProducts(),
  }))
  .get("/products/:slug", async ({ params }) => commerceQueries.store.getProductBySlug(params.slug))
  .post("/cart", async ({ user }) => commerceQueries.store.createCart(user?.id ?? null))
  .get("/cart/:cartToken", async ({ params }) =>
    commerceQueries.store.getCartByToken(params.cartToken),
  )
  .post("/cart/:cartToken/items", async ({ body, params }) => {
    const input = parseInput(cartItemInputSchema, body);
    return commerceQueries.store.addCartItem(params.cartToken, input.variantId, input.quantity);
  })
  .patch("/cart/:cartToken/items/:itemId", async ({ body, params }) => {
    const input = parseInput(cartItemInputSchema, body);
    return commerceQueries.store.updateCartItem(params.cartToken, params.itemId, input.quantity);
  })
  .delete("/cart/:cartToken/items/:itemId", async ({ params }) =>
    commerceQueries.store.removeCartItem(params.cartToken, params.itemId),
  )
  .post("/checkout", async ({ body, user }) => {
    const input = parseInput(checkoutInputSchema, body);
    return commerceQueries.store.createOrder(input, user?.id ?? null);
  })
  .post("/checkout/create-payment", async ({ body }) => {
    const input = parseInput(createPaymentInputSchema, body);
    return commerceQueries.payments.createQpayInvoiceForOrder(input.orderNumber);
  })
  .get("/payments/:paymentNumber/status", async ({ params }) => {
    const result = await commerceQueries.payments.getPaymentByNumber(params.paymentNumber);
    return {
      provider: result.provider,
      status: result.status,
    };
  })
  .get("/orders/:orderNumber", async ({ params }) =>
    commerceQueries.store.getOrderByNumber(params.orderNumber),
  )
  .post("/qpay/webhook", async ({ query, status }) => {
    const paymentNumber = typeof query.id === "string" ? query.id : null;
    if (!paymentNumber) return status(200, { ok: true });

    try {
      const targetPayment = await commerceQueries.payments.getPaymentByNumber(paymentNumber);
      if (!targetPayment.qpayInvoiceId) return status(200, { ok: true });

      const invoiceStatus = await checkQpayInvoice(targetPayment.qpayInvoiceId);
      if (invoiceStatus.paid) {
        await commerceQueries.payments.updatePaymentStatus(targetPayment.id, "success");
        await db
          .update(order)
          .set({ status: "pending", updatedAt: new Date() })
          .where(eq(order.id, targetPayment.orderId));
      }
    } catch (error) {
      console.error("qpay webhook failed", { paymentNumber, error: String(error) });
    }

    return status(200, { ok: true });
  });

export type App = typeof app;
