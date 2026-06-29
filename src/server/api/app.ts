import { Elysia } from "elysia";
import { DomainError } from "../lib/errors";
import { authPlugin } from "./plugins/auth";
import { adminOrderRoutes } from "./routes/admin-orders";
import { adminStatsRoutes } from "./routes/admin-stats";
import { adminRoutes } from "./routes/admin";
import { paymentRoutes } from "./routes/payments";
import { storefrontRoutes } from "./routes/storefront";

export const app = new Elysia({
  // Astro's Vite SSR environment blocks code generation from strings,
  // which breaks Elysia's default JIT (AOT) compilation. Interpreted
  // mode avoids `new Function()` / `eval` so the API works in dev.
  aot: false,
})
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

    // Log the actual error so unexpected throws (Drizzle/D1, better-auth
    // internals, Elysia ParseError) don't vanish in production.
    console.error("[api] unhandled error", error);

    return status(500, {
      error: {
        code: "internal-error",
        message: "Internal server error",
      },
    });
  })
  .use(authPlugin)
  .use(adminRoutes)
  .use(adminOrderRoutes)
  .use(adminStatsRoutes)
  .use(storefrontRoutes)
  .use(paymentRoutes)
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
  );

export type App = typeof app;
