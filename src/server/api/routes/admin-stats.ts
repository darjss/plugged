import { Elysia } from "elysia";
import { adminQueries as adminSettingsQueries } from "../../admin/queries";
import { adminUpdateUserSchema, adminUsersQuerySchema } from "../../admin/validation";
import { adminQueries } from "../../commerce/admin-queries";
import { getAnalyticsOverview } from "../../integrations/posthog";
import { authPlugin } from "../plugins/auth";
import { parseInput, parseQuery } from "../validation";

/**
 * Admin dashboard stats, analytics overview, settings, and user-admin
 * management. All guarded by `requireAdmin`.
 */
export const adminStatsRoutes = new Elysia({ name: "admin-stats-routes" })
  .use(authPlugin)
  .get("/admin/stats", () => adminQueries.getStats(), { requireAdmin: true })
  .get("/admin/analytics/overview", () => getAnalyticsOverview(), { requireAdmin: true })
  .get("/admin/settings", () => adminSettingsQueries.getSettings(), { requireAdmin: true })
  // Low-stock shortcut at `/admin/products?lowStock=true`. The full
  // `/admin/products` list lives in `adminRoutes` (registered first, so it
  // wins runtime dispatch); this duplicate is kept so Eden Treaty
  // intersects the `{ products }` shape into the route's inferred type,
  // which the dashboard home low-stock query depends on.
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
