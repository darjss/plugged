import { Elysia } from "elysia";
import { env } from "cloudflare:workers";
import { adminSettingsQueries, adminStatsQueries } from "../../admin";
import { adminUpdateUserSchema, adminUsersQuerySchema } from "../../admin/validation";
import { getAnalyticsOverview } from "../../integrations/posthog";
import { authPlugin } from "../plugins/auth";
import { errorHandlerPlugin } from "../plugins/errors";
import { parseInput, parseQuery } from "../validation";

/**
 * Admin dashboard stats, analytics overview, settings, and user-admin
 * management. All guarded by `requireAdmin`.
 */

// Analytics overview is a 30-day aggregate that changes slowly; cache it
// in the CACHE KV namespace for 60s to avoid re-running three HogQL
// queries on every dashboard load. The fresher `/admin/stats` endpoint
// (today's orders/revenue) is intentionally NOT cached.
const ANALYTICS_CACHE_KEY = "analytics:overview";
const ANALYTICS_CACHE_TTL = 60;

export const adminStatsRoutes = new Elysia({ name: "admin-stats-routes" })
  .use(errorHandlerPlugin)
  .use(authPlugin)
  .get("/admin/stats", () => adminStatsQueries.getStats(), { requireAdmin: true })
  .get(
    "/admin/analytics/overview",
    async () => {
      const cached = await env.CACHE.get(ANALYTICS_CACHE_KEY);
      if (cached) {
        // Cast at the serialization boundary: the KV value is the JSON
        // round-trip of getAnalyticsOverview (all-JSON-safe fields), so
        // the route keeps a single inferred return type instead of `any`.
        return JSON.parse(cached) as Awaited<ReturnType<typeof getAnalyticsOverview>>;
      }

      const result = await getAnalyticsOverview();
      await env.CACHE.put(ANALYTICS_CACHE_KEY, JSON.stringify(result), {
        expirationTtl: ANALYTICS_CACHE_TTL,
      });
      return result;
    },
    { requireAdmin: true },
  )
  .get("/admin/settings", () => adminSettingsQueries.getSettings(), { requireAdmin: true })
  // Low-stock variants for the dashboard home alerts list. Dedicated
  // endpoint so the home widget doesn't fight the full `/admin/products`
  // list handler for runtime dispatch. Returns exactly the fields the
  // widget renders: productSlug, productName, variantName, sku, stockQuantity.
  .get("/admin/products/low-stock", () => adminStatsQueries.getLowStockProducts(), {
    requireAdmin: true,
  })
  .get(
    "/admin/users",
    async ({ query }) => {
      const input = parseQuery(adminUsersQuerySchema, query);
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
  );
