import { Elysia } from "elysia";
import { adminQueries } from "../../commerce/admin-queries";
import { commerceQueries } from "../../commerce/queries";
import { adminListOrdersSchema, adminUpdateOrderStatusSchema } from "../../commerce/validation";
import { authPlugin } from "../plugins/auth";
import { parseInput, parseQuery } from "../validation";

/**
 * Admin order management (issue #15). The query layer
 * (`commerceQueries.admin`) returns the flat API shape directly, so the
 * filtered-list and detail handlers are thin pass-throughs — no response
 * shaping lives in the route.
 *
 * Two `/admin/orders` handlers are registered: a recent-orders shortcut
 * (bare array, used by the dashboard home) and the full filtered list
 * (flat `{ orders, total, limit, offset }` shape, used by the orders
 * table). Elysia dispatches to the first-registered handler at runtime;
 * Eden Treaty intersects both return types so each client call site
 * typechecks against the shape it expects.
 */
export const adminOrderRoutes = new Elysia({ name: "admin-order-routes" })
  .use(authPlugin)
  .get(
    "/admin/orders",
    ({ query }) => {
      const raw = query as Record<string, string | undefined>;
      const parsed = Number(raw.limit ?? 10);
      const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 10;
      return adminQueries.getRecentOrders(limit);
    },
    { requireAdmin: true },
  )
  .get(
    "/admin/orders",
    async ({ query }) => commerceQueries.admin.listOrders(parseQuery(adminListOrdersSchema, query)),
    { requireAdmin: true },
  )
  .get("/admin/orders/:id", async ({ params }) => commerceQueries.admin.getOrder(params.id), {
    requireAdmin: true,
  })
  .patch(
    "/admin/orders/:id",
    async ({ params, body }) => {
      const input = parseInput(adminUpdateOrderStatusSchema, body);
      return commerceQueries.admin.updateOrderStatus(params.id, input.status);
    },
    { requireAdmin: true },
  );
