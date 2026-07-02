import { Elysia } from "elysia";
import { authPlugin } from "./plugins/auth";
import { errorHandlerPlugin } from "./plugins/errors";
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
  .use(errorHandlerPlugin)
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
