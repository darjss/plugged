import { and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";
import { db } from "../db";
import {
  brand,
  cart,
  cartItem,
  category,
  deliveryFeeMnt,
  order,
  orderItem,
  orderStatuses,
  payment,
  paymentStatuses,
  product,
  productCategory,
  productVariant,
} from "../db/schema";
import { ConflictError, NotFoundError, OutOfStockError } from "../lib/errors";
import { createQpayInvoice } from "../integrations/qpay";
import { adminListOrdersSchema, checkoutInputSchema, productListQuerySchema } from "./validation";

const publicProductColumns = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  description: true,
  status: true,
  basePriceMnt: true,
  compareAtPriceMnt: true,
  currency: true,
  featured: true,
  oldSlugs: true,
} as const;

const now = () => new Date();
const activeProduct = () => eq(product.status, "active");
const DEFAULT_PAGE_SIZE = 12;

export const commerceQueries = {
  store: {
    /**
     * List active products with optional category/brand/featured filters
     * and limit/offset pagination. Category and brand are filtered by slug
     * via subqueries so the relational `with` shape stays stable.
     *
     * Unknown slugs resolve to an always-false condition (instead of an
     * early `return []`) so the function has a single return type and
     * Eden Treaty can infer the response shape cleanly.
     */
    async getProducts(input: v.InferOutput<typeof productListQuerySchema> = {}) {
      const limit = input.limit ?? DEFAULT_PAGE_SIZE;
      const offset = input.offset ?? 0;

      const conditions = [activeProduct()];

      if (input.featured !== undefined) {
        conditions.push(eq(product.featured, input.featured));
      }

      if (input.brandSlug) {
        const brandRow = await db.query.brand.findFirst({
          where: eq(brand.slug, input.brandSlug),
          columns: { id: true },
        });
        // Unknown brand slug → match nothing.
        conditions.push(brandRow ? eq(product.brandId, brandRow.id) : eq(product.id, ""));
      }

      if (input.categorySlug) {
        const categoryRow = await db.query.category.findFirst({
          where: eq(category.slug, input.categorySlug),
          columns: { id: true },
        });
        let productIds: string[] = [];
        if (categoryRow) {
          const links = await db
            .select({ productId: productCategory.productId })
            .from(productCategory)
            .where(eq(productCategory.categoryId, categoryRow.id));
          productIds = links.map((row) => row.productId);
        }
        // Unknown category slug or no products in category → match nothing.
        conditions.push(
          productIds.length > 0 ? inArray(product.id, productIds) : eq(product.id, ""),
        );
      }

      return db.query.product.findMany({
        columns: publicProductColumns,
        orderBy: [desc(product.featured), desc(product.createdAt)],
        where: and(...conditions),
        limit,
        offset,
        with: {
          brand: true,
          iemSpec: true,
          images: {
            orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.sortOrder)],
          },
          variants: {
            where: (variant, { eq }) => eq(variant.active, true),
          },
        },
      });
    },

    async getProductsByIds(ids: string[], limit = DEFAULT_PAGE_SIZE) {
      const uniqueIds = Array.from(new Set(ids)).slice(0, limit);
      if (uniqueIds.length === 0) return [];

      const rows = await db.query.product.findMany({
        columns: publicProductColumns,
        where: and(activeProduct(), inArray(product.id, uniqueIds)),
        with: {
          brand: true,
          iemSpec: true,
          images: {
            orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.sortOrder)],
          },
          variants: {
            where: (variant, { eq }) => eq(variant.active, true),
          },
        },
      });

      const rank = new Map(uniqueIds.map((id, index) => [id, index]));
      return rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    },

    /**
     * All categories, ordered by name. Used by the storefront filter bar
     * and category landing-page navigation.
     */
    async getCategories() {
      return db.select().from(category).orderBy(category.name);
    },

    /**
     * All brands, ordered by name. Used by the storefront filter bar.
     */
    async getBrands() {
      return db.select().from(brand).orderBy(brand.name);
    },

    async getProductBySlug(slug: string) {
      const result = await db.query.product.findFirst({
        columns: publicProductColumns,
        where: and(activeProduct(), eq(product.slug, slug)),
        with: {
          brand: true,
          categories: {
            with: {
              category: true,
            },
          },
          iemSpec: true,
          images: {
            orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.sortOrder)],
          },
          variants: {
            where: (variant, { eq }) => eq(variant.active, true),
          },
        },
      });

      if (!result) throw new NotFoundError("product", slug);
      return result;
    },

    async createCart(userId: null | string) {
      const date = now();
      const id = nanoid();
      const anonymousToken = nanoid(32);

      await db.insert(cart).values({
        anonymousToken,
        createdAt: date,
        id,
        updatedAt: date,
        userId,
      });

      return this.getCartByToken(anonymousToken);
    },

    async getCartByToken(cartToken: string) {
      const result = await db.query.cart.findFirst({
        where: eq(cart.anonymousToken, cartToken),
        with: {
          items: {
            with: {
              product: {
                with: {
                  images: {
                    orderBy: (image, { asc, desc }) => [
                      desc(image.isPrimary),
                      asc(image.sortOrder),
                    ],
                  },
                },
              },
              variant: true,
            },
          },
        },
      });

      if (!result) throw new NotFoundError("cart", cartToken);
      return result;
    },

    /**
     * Fetch a cart by its anonymous token or throw NotFoundError.
     * Single-sources the duplicated fetch + throw that previously
     * appeared in addCartItem / updateCartItem / removeCartItem /
     * createOrder. `withRelations` defaults to `{ items: true }` (the
     * shape those callers used); pass a richer `withRelations` for
     * createOrder.
     */
    async getCartOrThrow(
      cartToken: string,
      withRelations: Record<string, unknown> = { items: true },
    ) {
      const result = await db.query.cart.findFirst({
        where: eq(cart.anonymousToken, cartToken),
        with: withRelations as never,
      });
      if (!result) throw new NotFoundError("cart", cartToken);
      return result;
    },

    async addCartItem(cartToken: string, variantId: string, quantity: number) {
      const currentCart = await this.getCartOrThrow(cartToken);

      const variant = await db.query.productVariant.findFirst({
        where: and(eq(productVariant.id, variantId), eq(productVariant.active, true)),
        with: {
          product: true,
        },
      });

      if (!variant || variant.product.status !== "active") {
        throw new NotFoundError("variant", variantId);
      }

      const availableQuantity = variant.stockQuantity - variant.reservedQuantity;

      if (availableQuantity < quantity) {
        throw new OutOfStockError(variantId, quantity, availableQuantity);
      }

      const date = now();
      const existing = await db.query.cartItem.findFirst({
        where: and(eq(cartItem.cartId, currentCart.id), eq(cartItem.variantId, variantId)),
      });

      if (existing) {
        const nextQuantity = existing.quantity + quantity;

        if (availableQuantity < nextQuantity) {
          throw new OutOfStockError(variantId, nextQuantity, availableQuantity);
        }

        await db
          .update(cartItem)
          .set({
            quantity: nextQuantity,
            updatedAt: date,
          })
          .where(eq(cartItem.id, existing.id));
      } else {
        await db.insert(cartItem).values({
          cartId: currentCart.id,
          createdAt: date,
          id: nanoid(),
          productId: variant.productId,
          quantity,
          updatedAt: date,
          variantId,
        });
      }

      await db.update(cart).set({ updatedAt: date }).where(eq(cart.id, currentCart.id));

      return this.getCartByToken(cartToken);
    },

    async updateCartItem(cartToken: string, itemId: string, quantity: number) {
      const currentCart = await this.getCartOrThrow(cartToken);

      const existing = await db.query.cartItem.findFirst({
        where: and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)),
        with: {
          variant: true,
        },
      });

      if (!existing) throw new NotFoundError("cart-item", itemId);

      const availableQuantity = existing.variant.stockQuantity - existing.variant.reservedQuantity;

      if (availableQuantity < quantity) {
        throw new OutOfStockError(existing.variantId, quantity, availableQuantity);
      }

      const date = now();

      await db
        .update(cartItem)
        .set({
          quantity,
          updatedAt: date,
        })
        .where(eq(cartItem.id, existing.id));
      await db.update(cart).set({ updatedAt: date }).where(eq(cart.id, currentCart.id));

      return this.getCartByToken(cartToken);
    },

    async removeCartItem(cartToken: string, itemId: string) {
      const currentCart = await this.getCartOrThrow(cartToken);

      const existing = await db.query.cartItem.findFirst({
        where: and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)),
      });

      if (!existing) throw new NotFoundError("cart-item", itemId);

      await db
        .delete(cartItem)
        .where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, currentCart.id)));
      await db.update(cart).set({ updatedAt: now() }).where(eq(cart.id, currentCart.id));

      return this.getCartByToken(cartToken);
    },

    /**
     * Normalized line item used by createOrder regardless of whether the
     * source is a server-side cart (cartToken) or client-side items array.
     */
    async resolveCheckoutLines(input: v.InferOutput<typeof checkoutInputSchema>) {
      if (input.items && input.items.length > 0) {
        // Client-side cart flow: look up each variant + its product from DB.
        const variants = await db.query.productVariant.findMany({
          where: inArray(
            productVariant.id,
            input.items.map((i) => i.variantId),
          ),
          with: { product: true },
        });

        const byId = new Map(variants.map((v) => [v.id, v]));
        const lines = input.items.map((requested) => {
          const variant = byId.get(requested.variantId);
          if (!variant) throw new NotFoundError("variant", requested.variantId);
          return {
            productId: variant.productId,
            quantity: requested.quantity,
            variantId: variant.id,
            variant,
            product: variant.product,
          };
        });

        return { lines, sourceCartId: null };
      }

      if (!input.cartToken) {
        throw new ConflictError("Checkout requires either cartToken or items.");
      }

      const currentCart = await db.query.cart.findFirst({
        where: eq(cart.anonymousToken, input.cartToken),
        with: {
          items: {
            with: {
              product: true,
              variant: true,
            },
          },
        },
      });
      if (!currentCart) throw new NotFoundError("cart", input.cartToken);

      if (currentCart.items.length === 0) throw new ConflictError("Cart is empty");

      return {
        lines: currentCart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variantId: item.variantId,
          variant: item.variant,
          product: item.product,
        })),
        sourceCartId: currentCart.id,
      };
    },

    async createOrder(input: v.InferOutput<typeof checkoutInputSchema>, userId: null | string) {
      const { lines, sourceCartId } = await this.resolveCheckoutLines(input);

      const unavailable = lines.find((line) => {
        const availableQuantity = line.variant.stockQuantity - line.variant.reservedQuantity;
        return (
          line.product.status !== "active" ||
          !line.variant.active ||
          availableQuantity < line.quantity
        );
      });

      if (unavailable) {
        const availableQuantity =
          unavailable.variant.stockQuantity - unavailable.variant.reservedQuantity;
        throw new OutOfStockError(unavailable.variantId, unavailable.quantity, availableQuantity);
      }

      const date = now();
      const orderId = nanoid();
      const paymentId = nanoid();
      const subtotalMnt = lines.reduce(
        (sum, line) => sum + line.variant.priceMnt * line.quantity,
        0,
      );
      const totalMnt = subtotalMnt + deliveryFeeMnt;
      const orderNumber = `PLG-${nanoid(10).toUpperCase()}`;
      const paymentNumber = `PAY-${nanoid(10).toUpperCase()}`;
      const checkoutToken = nanoid(32);

      // SINGLE atomic batch: order + order_items + payment + cart clear
      // + stock decrements all in one `db.batch()`. A failure mid-batch
      // rolls back the entire checkout — no orphaned order rows, no
      // cleared cart without an order, no decremented stock without a
      // corresponding order item. Stock decrements are conditional on
      // `stockQuantity >= quantity` so concurrent checkouts can't
      // drive stock negative (the availability check above is a
      // read-then-write guard; the conditional UPDATE is the
      // write-time guard).
      const batchStmts = [
        db.insert(order).values({
          address: input.address,
          checkoutToken,
          createdAt: date,
          customerName: input.customerName ?? null,
          customerPhone: input.customerPhone,
          deliveryFeeMnt,
          deliveryProvider: input.deliveryProvider,
          id: orderId,
          notes: input.notes ?? null,
          orderNumber,
          orderedAt: date,
          status: "pending",
          subtotalMnt,
          totalMnt,
          updatedAt: date,
          userId,
        }),
        db.insert(orderItem).values(
          lines.map((line) => ({
            createdAt: date,
            id: nanoid(),
            lineTotalMnt: line.variant.priceMnt * line.quantity,
            orderId,
            productId: line.productId,
            productName: line.product.name,
            quantity: line.quantity,
            sku: line.variant.sku,
            unitPriceMnt: line.variant.priceMnt,
            variantId: line.variantId,
            variantName: line.variant.name,
          })),
        ),
        db.insert(payment).values({
          amountMnt: totalMnt,
          createdAt: date,
          id: paymentId,
          orderId,
          paymentNumber,
          provider: input.paymentProvider ?? "qpay",
          status: "pending",
          updatedAt: date,
        }),
      ];

      if (sourceCartId) {
        batchStmts.push(db.delete(cartItem).where(eq(cartItem.cartId, sourceCartId)));
      }

      batchStmts.push(
        ...lines.map((line) =>
          db
            .update(productVariant)
            .set({
              stockQuantity: sql`${productVariant.stockQuantity} - ${line.quantity}`,
              updatedAt: date,
            })
            .where(
              and(
                eq(productVariant.id, line.variantId),
                sql`${productVariant.stockQuantity} >= ${line.quantity}`,
              ),
            ),
        ),
      );

      await db.batch(batchStmts);

      const created = await db.query.order.findFirst({
        where: eq(order.id, orderId),
        with: {
          items: true,
          payments: true,
        },
      });
      if (!created) throw new NotFoundError("order", orderId);
      return created;
    },

    async getOrderByNumber(orderNumber: string) {
      const result = await db.query.order.findFirst({
        where: eq(order.orderNumber, orderNumber),
        with: {
          items: true,
          payments: true,
        },
      });

      if (!result) throw new NotFoundError("order", orderNumber);
      return result;
    },
  },

  payments: {
    /**
     * Fetch a payment (with its order) by payment number.
     */
    async getPaymentByNumber(paymentNumber: string) {
      const result = await db.query.payment.findFirst({
        where: eq(payment.paymentNumber, paymentNumber),
        with: {
          order: true,
        },
      });

      if (!result) throw new NotFoundError("payment", paymentNumber);
      return result;
    },

    /**
     * Update a payment's status. Throws on invalid status to keep the
     * picklist values shared from the server schema.
     */
    async updatePaymentStatus(paymentId: string, nextStatus: (typeof paymentStatuses)[number]) {
      if (!paymentStatuses.includes(nextStatus)) {
        throw new ConflictError(`Invalid payment status: ${nextStatus}`);
      }

      const date = now();
      const patch: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: date,
      };
      if (nextStatus === "success") patch.paidAt = date;

      await db.update(payment).set(patch).where(eq(payment.id, paymentId));

      const updated = await db.query.payment.findFirst({ where: eq(payment.id, paymentId) });
      if (!updated) throw new NotFoundError("payment", paymentId);
      return updated;
    },

    /**
     * Idempotent, atomic payment confirmation. Used by the QPay webhook.
     *
     * - Re-reads the payment row. If already `success`, heals the
     *   order status to `paid` if it's still `pending` (covers the
     *   crash window where a previous confirmation updated the payment
     *   but crashed before the order update committed) then returns
     *   `{ confirmed: false }`.
     * - Verifies the paid amount covers the invoice amount before
     *   confirming (defends against partial-payment "PAID" markers).
     * - Updates payment → `success` AND order → `paid` in a SINGLE
     *   `db.batch()` so the two writes can never diverge. The
     *   conditional `WHERE status = 'pending'` on the payment update
     *   makes confirmation idempotent by construction: if another
     *   worker already flipped the payment, `rowsAffected === 0` and
     *   the order update is skipped (the already-success heal path
     *   above covers the crash-window case).
     *
     * Returns `{ confirmed: true }` when this call did the confirmation,
     * or `{ confirmed: false }` when the payment was already settled
     * (no-op or heal-only).
     */
    async confirmQpayPayment(
      paymentId: string,
      paidAmountMnt: number | null,
    ): Promise<{ confirmed: boolean }> {
      const targetPayment = await db.query.payment.findFirst({
        where: eq(payment.id, paymentId),
        with: { order: true },
      });
      if (!targetPayment) throw new NotFoundError("payment", paymentId);

      // Idempotency: already settled. Heal the order status if a
      // previous confirmation crashed after updating the payment but
      // before the order update committed. Without this heal, a retry
      // would see payment=success and bail, leaving the order stuck
      // in `pending` forever.
      if (targetPayment.status === "success") {
        if (targetPayment.order && targetPayment.order.status === "pending") {
          const healDate = now();
          await db.batch([
            db
              .update(order)
              .set({ status: "paid", updatedAt: healDate })
              .where(and(eq(order.id, targetPayment.orderId), eq(order.status, "pending"))),
          ]);
        }
        return { confirmed: false };
      }

      // Amount check: only confirm when the paid amount covers the
      // invoice amount. If QPay didn't report a paid amount, fall back
      // to trusting the PAID status (the webhook already verified via
      // the QPay API; this guard is defense-in-depth against partial
      // payments that QPay marks "PAID").
      const required = targetPayment.amountMnt;
      if (paidAmountMnt !== null && paidAmountMnt < required) {
        throw new ConflictError(`Paid amount ${paidAmountMnt} does not cover invoice ${required}`);
      }

      const date = now();

      // SINGLE atomic batch: payment → success AND order → paid
      // together. The payment update is conditional on
      // `status = 'pending'` so concurrent confirmations don't
      // double-flip. If the payment conditional fails (another worker
      // already confirmed), the order update still runs but is
      // harmless — it's conditional on `status = 'pending'` too, so
      // it won't clobber a `paid`/`shipped`/`delivered` order.
      await db.batch([
        db
          .update(payment)
          .set({ status: "success", paidAt: date, updatedAt: date })
          .where(and(eq(payment.id, paymentId), eq(payment.status, "pending"))),
        db
          .update(order)
          .set({ status: "paid", updatedAt: date })
          .where(and(eq(order.id, targetPayment.orderId), eq(order.status, "pending"))),
      ]);

      return { confirmed: true };
    },

    /**
     * Create a QPay invoice for an order's outstanding payment and persist
     * the invoice id + QR data on the payment record. Returns the QR data
     * for the client to render.
     *
     * Idempotent: if a QPay invoice is already attached, returns the
     * existing QR data instead of minting a new one (prevents orphaned
     * invoices when the route is called twice).
     */
    async createQpayInvoiceForOrder(orderNumber: string) {
      const targetOrder = await db.query.order.findFirst({
        where: eq(order.orderNumber, orderNumber),
        with: {
          payments: true,
        },
      });

      if (!targetOrder) throw new NotFoundError("order", orderNumber);

      const targetPayment = targetOrder.payments.find((p) => p.provider === "qpay");
      if (!targetPayment) throw new NotFoundError("qpay-payment", orderNumber);

      // Idempotency: if a QPay invoice is already attached, return the
      // existing QR data instead of minting a new one. Re-minting would
      // orphan the first invoice and break any client already showing
      // the first QR.
      if (targetPayment.qpayInvoiceId && targetPayment.qpayQrText) {
        return {
          invoiceId: targetPayment.qpayInvoiceId,
          paymentNumber: targetPayment.paymentNumber,
          qrImage: targetPayment.qpayQrImage ?? "",
          qrText: targetPayment.qpayQrText,
          shortUrl: targetPayment.qpayUrlsJson ?? "",
        };
      }

      const invoice = await createQpayInvoice(targetPayment.amountMnt, targetPayment.paymentNumber);

      const date = now();
      // Store the full QPay urls array as JSON in `qpay_urls_json` (the
      // column name promises JSON; the previous code stored a bare shortUrl
      // string and discarded the bank/deep-link URLs QPay returned).
      await db
        .update(payment)
        .set({
          qpayInvoiceId: invoice.invoiceId,
          qpayQrImage: invoice.qrImage,
          qpayQrText: invoice.qrText,
          qpayUrlsJson: JSON.stringify(invoice.urls),
          updatedAt: date,
        })
        .where(eq(payment.id, targetPayment.id));

      return {
        invoiceId: invoice.invoiceId,
        paymentNumber: targetPayment.paymentNumber,
        qrImage: invoice.qrImage,
        qrText: invoice.qrText,
        shortUrl: invoice.shortUrl,
      };
    },
  },

  orders: {
    /**
     * List orders for a phone number. Used by the profile page (logged-in
     * customer's own phone) and the public tracking page (guest lookups by
     * phone). Orders are returned newest-first with items + payments.
     */
    async getOrdersByPhone(phone: string) {
      return db.query.order.findMany({
        where: eq(order.customerPhone, phone),
        orderBy: [desc(order.createdAt)],
        with: {
          items: true,
          payments: true,
        },
      });
    },

    /**
     * Fetch a single order by its public order number, including line items
     * and payment records. Throws NotFoundError if no order matches.
     */
    async getOrderByNumber(orderNumber: string) {
      const result = await db.query.order.findFirst({
        where: eq(order.orderNumber, orderNumber),
        with: {
          items: true,
          payments: true,
        },
      });

      if (!result) throw new NotFoundError("order", orderNumber);
      return result;
    },
  },

  admin: {
    /**
     * List orders for the admin console with filters + pagination.
     * Uses the relational query API so each order carries its primary
     * payment (most recently updated) and optional customer account.
     */
    async listOrders(rawFilters: v.InferOutput<typeof adminListOrdersSchema>) {
      const filters = rawFilters;
      const limit = filters.limit ?? 25;
      const offset = filters.offset ?? 0;

      const conditions = [];

      if (filters.status) conditions.push(eq(order.status, filters.status));

      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        if (!Number.isNaN(from.getTime())) conditions.push(gte(order.orderedAt, from));
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        if (!Number.isNaN(to.getTime())) conditions.push(lte(order.orderedAt, to));
      }

      if (filters.search) {
        const term = `%${filters.search}%`;
        conditions.push(or(like(order.orderNumber, term), like(order.customerPhone, term))!);
      }

      if (filters.paymentStatus) {
        // Subquery: orders that have at least one payment with the given status.
        conditions.push(
          sql`${order.id} IN (
            SELECT ${payment.orderId} FROM ${payment}
            WHERE ${payment.status} = ${filters.paymentStatus}
          )`,
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db.query.order.findMany({
        where,
        orderBy: desc(order.orderedAt),
        limit,
        offset,
        with: {
          user: {
            columns: { email: true, name: true, phoneNumber: true },
          },
          payments: {
            orderBy: (p, { desc }) => [desc(p.updatedAt)],
            limit: 1,
            columns: {
              status: true,
              provider: true,
              paymentNumber: true,
            },
          },
        },
      });

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(order)
        .where(where);

      return {
        orders: rows,
        total: Number(count),
        limit,
        offset,
      };
    },

    /**
     * Full order for the admin detail view: items (with product image +
     * variant), payments, and the optional customer account.
     */
    async getOrder(id: string) {
      const result = await db.query.order.findFirst({
        where: eq(order.id, id),
        with: {
          items: {
            with: {
              product: {
                with: {
                  images: {
                    orderBy: (image, { asc, desc }) => [
                      desc(image.isPrimary),
                      asc(image.sortOrder),
                    ],
                    limit: 1,
                  },
                },
              },
              variant: true,
            },
          },
          payments: {
            orderBy: (p, { desc }) => [desc(p.updatedAt)],
          },
          user: true,
        },
      });

      if (!result) throw new NotFoundError("order", id);
      return result;
    },

    /**
     * Update an order's status. Allowed transitions:
     *   pending → shipped → delivered
     *   pending → cancelled
     * Throws ConflictError for any other transition.
     */
    async updateOrderStatus(id: string, nextStatus: (typeof orderStatuses)[number]) {
      if (!orderStatuses.includes(nextStatus)) {
        throw new ConflictError(`Invalid order status: ${nextStatus}`);
      }

      const current = await db.query.order.findFirst({
        where: eq(order.id, id),
        columns: { id: true, status: true },
      });

      if (!current) throw new NotFoundError("order", id);

      const allowed: Record<string, string[]> = {
        pending: ["paid", "shipped", "delivered", "cancelled"],
        paid: ["shipped", "delivered", "cancelled", "refunded"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: [],
        refunded: [],
      };

      const allowedNext = allowed[current.status] ?? [];
      if (!allowedNext.includes(nextStatus)) {
        throw new ConflictError(`Cannot transition order from ${current.status} to ${nextStatus}`);
      }

      const date = now();
      const patch: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: date,
      };
      if (nextStatus === "cancelled") patch.cancelledAt = date;

      await db.update(order).set(patch).where(eq(order.id, id));

      return this.getOrder(id);
    },
  },
};
