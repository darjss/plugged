import { Elysia } from "elysia";
import { commerceQueries } from "../commerce/queries";
import { cartItemInputSchema, checkoutInputSchema } from "../commerce/validation";
import { authPlugin } from "./plugins/auth";
import { parseInput, validationFailure } from "./validation";

export const app = new Elysia({ aot: false })
  .onError(({ error, status }) => {
    const failure = validationFailure(error);

    if (failure) {
      return status(400, failure);
    }
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
    data: await commerceQueries.store.getProducts(),
    ok: true,
  }))
  .get("/products/:slug", async ({ params, status }) => {
    const product = await commerceQueries.store.getProductBySlug(params.slug);

    if (!product) {
      return status(404, { error: "Product not found.", ok: false });
    }

    return { data: product, ok: true };
  })
  .post("/cart", async ({ user }) => ({
    data: await commerceQueries.store.createCart(user?.id ?? null),
    ok: true,
  }))
  .get("/cart/:cartToken", async ({ params, status }) => {
    const cart = await commerceQueries.store.getCartByToken(params.cartToken);

    if (!cart) {
      return status(404, { error: "Cart not found.", ok: false });
    }

    return { data: cart, ok: true };
  })
  .post("/cart/:cartToken/items", async ({ body, params, status }) => {
    const input = parseInput(cartItemInputSchema, body);
    const cart = await commerceQueries.store.addCartItem(params.cartToken, input.variantId, input.quantity);

    if (!cart) {
      return status(400, { error: "Could not add cart item.", ok: false });
    }

    return { data: cart, ok: true };
  })
  .patch("/cart/:cartToken/items/:itemId", async ({ body, params, status }) => {
    const input = parseInput(cartItemInputSchema, body);
    const cart = await commerceQueries.store.updateCartItem(params.cartToken, params.itemId, input.quantity);

    if (!cart) {
      return status(400, { error: "Could not update cart item.", ok: false });
    }

    return { data: cart, ok: true };
  })
  .delete("/cart/:cartToken/items/:itemId", async ({ params, status }) => {
    const cart = await commerceQueries.store.removeCartItem(params.cartToken, params.itemId);

    if (!cart) {
      return status(404, { error: "Could not remove cart item.", ok: false });
    }

    return { data: cart, ok: true };
  })
  .post("/checkout", async ({ body, status, user }) => {
    const input = parseInput(checkoutInputSchema, body);
    const order = await commerceQueries.store.createOrder(input, user?.id ?? null);

    if (!order) {
      return status(400, { error: "Could not create order.", ok: false });
    }

    return { data: order, ok: true };
  });

export type App = typeof app;
