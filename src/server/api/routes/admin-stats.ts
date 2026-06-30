import { Elysia } from "elysia";
import { adminSettingsQueries, adminStatsQueries } from "../../admin";
import { adminUpdateUserSchema, adminUsersQuerySchema } from "../../admin/validation";
import { getAnalyticsOverview } from "../../integrations/posthog";
import { authPlugin } from "../plugins/auth";
import { parseInput, parseQuery } from "../validation";

/**
 * Admin dashboard stats, analytics overview, settings, and user-admin
 * management. All guarded by `requireAdmin`.
 */
export const adminStatsRoutes = new Elysia({ name: "admin-stats-routes" })
  .use(authPlugin)
  .get("/admin/stats", () => adminStatsQueries.getStats(), { requireAdmin: true })
  .get("/admin/analytics/overview", () => getAnalyticsOverview(), { requireAdmin: true })
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
