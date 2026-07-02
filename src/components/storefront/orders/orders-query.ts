import { useQuery } from "@tanstack/solid-query";
import type { Accessor } from "solid-js";
import { api, unwrap } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import type { OrdersResponse } from "@/types/order-types";

/**
 * Shared `/orders?phone=` query for the order-history (session phone) and
 * order-tracking (manually entered phone) islands. Disabled until a phone
 * is available; both islands share the cache entry per phone number.
 */
export function createOrdersByPhoneQuery(phone: Accessor<string | undefined>) {
  return useQuery(
    () => ({
      queryKey: ["orders", "by-phone", phone()],
      queryFn: async (): Promise<OrdersResponse> => {
        const p = phone();
        if (!p) return { orders: [] };
        return unwrap(api.orders.get({ query: { phone: p } }));
      },
      enabled: Boolean(phone()),
    }),
    () => queryClient,
  );
}
