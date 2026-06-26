import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { commerceQueries } from "../commerce/queries";
import {
  adminListOrdersSchema,
  adminUpdateOrderStatusSchema,
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
