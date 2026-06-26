import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { adminQueries } from "../commerce/admin-queries";
import { adminQueries as adminSettingsQueries } from "../admin/queries";
import { adminUpdateUserSchema, adminUsersQuerySchema } from "../admin/validation";
import { commerceQueries } from "../commerce/queries";
import {
  adminListOrdersSchema,
  adminUpdateOrderStatusSchema,
  cartItemInputSchema,
  checkoutInputSchema,
  createPaymentInputSchema,
  productListQuerySchema,
} from "../commerce/validation";
import { db } from "../db";
import { order } from "../db/schema";
import { checkQpayInvoice } from "../integrations/qpay";
import { DomainError } from "../lib/errors";
import { MONGOLIAN_PHONE_REGEX } from "../../lib/utils";
import { authPlugin } from "./plugins/auth";
import { adminRoutes } from "./routes/admin";
import { parseInput } from "./validation";

const ordersPhoneQuerySchema = v.object({
  phone: v.pipe(v.string(), v.regex(MONGOLIAN_PHONE_REGEX)),
});

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
  .use(adminRoutes)
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
  .get("/products", async ({ query }) => {
    // Elysia delivers query params as strings; coerce numeric/boolean
    // fields and map the storefront-facing `category`/`brand` slug params
    // to the schema's `categorySlug`/`brandSlug` fields.
    const raw = query as Record<string, string | undefined>;
    const coerced: Record<string, unknown> = {};
    if (raw.categorySlug !== undefined) coerced.categorySlug = raw.categorySlug;
    if (raw.category !== undefined) coerced.categorySlug = raw.category;
    if (raw.brandSlug !== undefined) coerced.brandSlug = raw.brandSlug;
    if (raw.brand !== undefined) coerced.brandSlug = raw.brand;
    if (raw.status !== undefined) coerced.status = raw.status;
    if (raw.limit !== undefined) coerced.limit = Number(raw.limit);
    if (raw.offset !== undefined) coerced.offset = Number(raw.offset);
    if (raw.featured !== undefined) {
      coerced.featured = raw.featured === "true" || raw.featured === "1";
    }
    const input = parseInput(productListQuerySchema, coerced);
    return { products: await commerceQueries.store.getProducts(input) };
  })
  .get("/categories", () => commerceQueries.store.getCategories())
  .get("/brands", () => commerceQueries.store.getBrands())
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
  .get("/orders", async ({ query }) => {
    // Public lookup by phone — the phone number is the access key. This
    // supports the /track page for guest checkouts (no login required).
    // The profile page reuses the same endpoint for the logged-in
    // customer's own phone.
    const input = parseInput(ordersPhoneQuerySchema, query);
    return { orders: await commerceQueries.orders.getOrdersByPhone(input.phone) };
  })
  .get("/orders/:orderNumber", async ({ params }) =>
    commerceQueries.orders.getOrderByNumber(params.orderNumber),
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
  })
  // --- Admin order management (issue #15) -------------------------------
  // Routes map the drizzle relational results to flat shapes so Eden can
  // infer clean client types (the raw drizzle types are too deep for
  // Elysia's route-tree inference).
  .get(
    "/admin/orders",
    async ({ query }) => {
      const filters = parseInput(adminListOrdersSchema, {
        ...query,
        limit: query.limit ? Number(query.limit) : undefined,
        offset: query.offset ? Number(query.offset) : undefined,
      });
      const result = await commerceQueries.admin.listOrders(filters);
      return {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        orders: result.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerPhone: o.customerPhone,
          customerName: o.customerName,
          status: o.status,
          subtotalMnt: o.subtotalMnt,
          deliveryFeeMnt: o.deliveryFeeMnt,
          totalMnt: o.totalMnt,
          orderedAt: o.orderedAt,
          createdAt: o.createdAt,
          user: o.user
            ? {
                email: o.user.email,
                name: o.user.name,
                phoneNumber: o.user.phoneNumber,
              }
            : null,
          payment: o.payments[0]
            ? {
                status: o.payments[0].status,
                provider: o.payments[0].provider,
                paymentNumber: o.payments[0].paymentNumber,
              }
            : null,
        })),
      };
    },
    { requireAdmin: true },
  )
  .get(
    "/admin/orders/:id",
    async ({ params }) => {
      const o = await commerceQueries.admin.getOrder(params.id);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerPhone: o.customerPhone,
        customerName: o.customerName,
        status: o.status,
        subtotalMnt: o.subtotalMnt,
        deliveryFeeMnt: o.deliveryFeeMnt,
        totalMnt: o.totalMnt,
        address: o.address,
        deliveryProvider: o.deliveryProvider,
        notes: o.notes,
        orderedAt: o.orderedAt,
        createdAt: o.createdAt,
        cancelledAt: o.cancelledAt,
        user: o.user
          ? {
              email: o.user.email,
              name: o.user.name,
              phoneNumber: o.user.phoneNumber,
            }
          : null,
        items: o.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          unitPriceMnt: item.unitPriceMnt,
          quantity: item.quantity,
          lineTotalMnt: item.lineTotalMnt,
          product: {
            slug: item.product.slug,
            image: item.product.images[0]
              ? {
                  url: item.product.images[0].url,
                  alt: item.product.images[0].alt,
                }
              : null,
          },
        })),
        payments: o.payments.map((p) => ({
          id: p.id,
          paymentNumber: p.paymentNumber,
          provider: p.provider,
          status: p.status,
          amountMnt: p.amountMnt,
          qpayInvoiceId: p.qpayInvoiceId,
          paidAt: p.paidAt,
        })),
      };
    },
    { requireAdmin: true },
  )
  .patch(
    "/admin/orders/:id",
    async ({ params, body }) => {
      const input = parseInput(adminUpdateOrderStatusSchema, body);
      const o = await commerceQueries.admin.updateOrderStatus(params.id, input.status);
      return {
        id: o.id,
        status: o.status,
        cancelledAt: o.cancelledAt,
        updatedAt: o.updatedAt,
      };
    },
    { requireAdmin: true },
  );

export type App = typeof app;
