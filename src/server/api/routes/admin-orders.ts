import { Elysia } from "elysia";
import * as v from "valibot";
import { adminStatsQueries, listOrders, getOrder, updateOrderStatus } from "../../admin";
import { adminListOrdersSchema, adminUpdateOrderStatusSchema } from "../../commerce/validation";
import { authPlugin } from "../plugins/auth";
import { parseInput, parseQuery } from "../validation";

const recentOrdersQuerySchema = v.object({
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50))),
});

/**
 * Admin order management (issue #15). The query layer returns the flat
 * API shape directly, so the filtered-list and detail handlers are thin
 * pass-throughs — no response shaping lives in the route.
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
      const { limit } = parseQuery(recentOrdersQuerySchema, query);
      return adminStatsQueries.getRecentOrders(limit ?? 10);
    },
    { requireAdmin: true },
  )
  .get("/admin/orders", async ({ query }) => listOrders(parseQuery(adminListOrdersSchema, query)), {
    requireAdmin: true,
  })
  .get("/admin/orders/:id", async ({ params }) => getOrder(params.id), {
    requireAdmin: true,
  })
  .patch(
    "/admin/orders/:id",
    async ({ params, body }) => {
      const input = parseInput(adminUpdateOrderStatusSchema, body);
      return updateOrderStatus(params.id, input.status);
    },
    { requireAdmin: true },
  );
