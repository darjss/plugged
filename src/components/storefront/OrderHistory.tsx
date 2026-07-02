import { createMemo, For, Show } from "solid-js";
import { authClient } from "@/lib/auth-client";
import type { OrderRow } from "@/types/order-types";
import OrderCard from "./orders/OrderCard";
import { createOrdersByPhoneQuery } from "./orders/orders-query";
import { OrdersEmpty, OrdersError, OrdersLoading } from "./orders/query-states";

/**
 * Order history for the profile page. Reads the logged-in user's phone
 * from the Better Auth session atom, then fetches `/orders?phone=` via
 * the shared orders-by-phone query. Each order links to its confirmation
 * page for detail.
 */
export default function OrderHistory() {
  const session = authClient.useSession();
  const phone = () => session()?.data?.user?.phoneNumber ?? undefined;

  const ordersQuery = createOrdersByPhoneQuery(phone);

  const orders = createMemo<OrderRow[]>(() => ordersQuery.data?.orders ?? []);

  return (
    <div class="space-y-4">
      <Show when={ordersQuery.isPending}>
        <OrdersLoading label="Loading orders…" />
      </Show>

      <Show when={ordersQuery.isError}>
        <OrdersError
          onRetry={() => void ordersQuery.refetch()}
          isFetching={ordersQuery.isFetching}
        />
      </Show>

      <Show when={ordersQuery.isSuccess && orders().length === 0}>
        <OrdersEmpty
          title="No orders yet"
          description="You haven't placed any orders yet"
          action={
            <a
              href="/products"
              class="mt-4 inline-block border-2 border-ink bg-orange px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-ink shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Browse products →
            </a>
          }
        />
      </Show>

      <Show when={orders().length > 0}>
        <ul class="space-y-4">
          <For each={orders()}>
            {(order) => (
              <OrderCard order={order} detailsHref={`/order/confirm/${order.orderNumber}`} />
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
