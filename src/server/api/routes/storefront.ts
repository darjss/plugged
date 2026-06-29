import { Elysia } from "elysia";
import * as v from "valibot";
import { commerceQueries } from "../../commerce/queries";
import {
  cartItemInputSchema,
  checkoutInputSchema,
  productListQuerySchema,
} from "../../commerce/validation";
import { searchProducts } from "../../search/search";
import { MONGOLIAN_PHONE_REGEX } from "../../../lib/utils";
import { nonEmptyString } from "../../lib/validation-primitives";
import { authPlugin } from "../plugins/auth";
import { parseInput, parseQuery } from "../validation";

const ordersPhoneQuerySchema = v.object({
  phone: v.pipe(v.string(), v.regex(MONGOLIAN_PHONE_REGEX)),
});

const searchQuerySchema = v.object({
  q: nonEmptyString,
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50))),
});

/**
 * Public storefront routes. Cart, checkout, order lookup, product/catalog
 * reads, and AI search. All validated through the commerce valibot schemas
 * via `parseInput` / `parseQuery`.
 *
 * Query coercion (numbers/booleans from string params) is handled by
 * `parseQuery`; the only route-specific shaping kept here is the
 * `?category=`/`?brand=` alias mapping onto the schema's
 * `categorySlug`/`brandSlug` fields.
 */
export const storefrontRoutes = new Elysia({ name: "storefront-routes" })
  .use(authPlugin)
  .get("/products", async ({ query }) => {
    const raw = query as Record<string, string | undefined>;
    // Map the storefront-facing `category`/`brand` aliases onto the
    // schema's `categorySlug`/`brandSlug` fields before typed parsing.
    const aliased: Record<string, string | undefined> = { ...raw };
    if (aliased.categorySlug === undefined && aliased.category !== undefined) {
      aliased.categorySlug = aliased.category;
    }
    if (aliased.brandSlug === undefined && aliased.brand !== undefined) {
      aliased.brandSlug = aliased.brand;
    }
    const input = parseQuery(productListQuerySchema, aliased);
    return { products: await commerceQueries.store.getProducts(input) };
  })
  .get("/products/:slug", async ({ params }) => commerceQueries.store.getProductBySlug(params.slug))
  .get("/categories", () => commerceQueries.store.getCategories())
  .get("/brands", () => commerceQueries.store.getBrands())
  .get("/search", async ({ query }) => {
    const raw = query as Record<string, string | undefined>;
    const input = parseQuery(searchQuerySchema, { ...raw, q: raw.q ?? "" });
    return { products: await searchProducts(input) };
  })
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
    const input = parseQuery(ordersPhoneQuerySchema, query);
    return { orders: await commerceQueries.orders.getOrdersByPhone(input.phone) };
  })
  .get("/orders/:orderNumber", async ({ params }) =>
    commerceQueries.orders.getOrderByNumber(params.orderNumber),
  );
