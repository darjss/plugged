import { Elysia } from "elysia";
import { commerceQueries } from "../commerce/queries";
import { cartItemInputSchema, checkoutInputSchema } from "../commerce/validation";
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
  });

export type App = typeof app;
