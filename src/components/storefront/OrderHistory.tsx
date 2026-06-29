import { useQuery } from "@tanstack/solid-query";
import { createMemo, For, Show } from "solid-js";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { authClient } from "@/lib/auth-client";
import { cn, formatMnt, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { OrderItem, OrderRow, OrdersResponse } from "@/types/order-types";
import { statusLabel, statusVariant } from "@/types/order-types";

/**
 * Order history for the profile page. Reads the logged-in user's phone
 * from the Better Auth session atom, then fetches `/orders?phone=` via
 * Eden Treaty. Each order links to the public tracking page for detail.
 */
export default function OrderHistory() {
  const session = authClient.useSession();
  const phone = () => session()?.data?.user?.phoneNumber ?? null;

  const ordersQuery = useQuery(
    () => ({
      queryKey: ["orders", phone()],
      queryFn: async (): Promise<OrdersResponse> => {
        const p = phone();
        if (!p) return { orders: [] };
        const { data, error } = await api.orders.get({ query: { phone: p } });
        if (error) throw error;
        return data as unknown as OrdersResponse;
      },
      enabled: Boolean(phone()),
    }),
    () => queryClient,
  );

  const orders = createMemo<OrderRow[]>(() => ordersQuery.data?.orders ?? []);

  return (
    <div class="space-y-4">
      <Show when={ordersQuery.isPending}>
        <div class="border-2 border-ink bg-newsprint-2 p-8 text-center shadow-hard-sm">
          <p class="font-mono text-xs font-black uppercase tracking-widest text-ink-muted">
            Loading orders…
          </p>
        </div>
      </Show>

      <Show when={ordersQuery.isError}>
        <div class="flex flex-col gap-3 border-2 border-ink bg-pink p-4 shadow-hard-sm">
          <div class="flex items-center gap-2">
            <span class="rotate-[-2deg] border-2 border-ink bg-newsprint px-2 py-0.5 font-mono text-micro font-black uppercase tracking-wider text-pink shadow-hard-sm">
              Error
            </span>
            <span class="font-display text-lg font-black uppercase tracking-tight text-newsprint">
              Fetch error
            </span>
          </div>
          <p class="font-mono text-xs font-bold text-newsprint/90">
            Something went wrong while fetching your orders. Might be a network issue — please try
            again.
          </p>
          <button
            type="button"
            onClick={() => void ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
            class="inline-flex items-center justify-center gap-2 border-2 border-ink bg-hazard-stripes px-5 py-3 font-display text-sm font-black uppercase tracking-wide text-ink shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50"
          >
            {ordersQuery.isFetching ? "LOADING…" : "↻ Retry"}
          </button>
        </div>
      </Show>

      <Show when={ordersQuery.isSuccess && orders().length === 0}>
        <div class="border-2 border-ink bg-newsprint-2 p-8 text-center shadow-hard-sm">
          <p class="font-display text-2xl uppercase text-ink">No orders yet</p>
          <p class="mt-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
            You haven't placed any orders yet
          </p>
          <a
            href="/products"
            class="mt-4 inline-block border-2 border-ink bg-orange px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-ink shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Browse products →
          </a>
        </div>
      </Show>

      <Show when={orders().length > 0}>
        <ul class="space-y-4">
          <For each={orders()}>
            {(order) => {
              const itemCount = order.items.reduce(
                (sum: number, item: OrderItem) => sum + item.quantity,
                0,
              );
              return (
                <li class="border-2 border-ink bg-newsprint-2 shadow-hard-sm transition-all hover:-translate-y-[1px] hover:shadow-hard">
                  <a
                    href={`/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.customerPhone)}`}
                    class="block"
                  >
                    {/* Order header strip */}
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-newsprint-dark px-4 py-3">
                      <div class="flex items-center gap-3">
                        <span class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          No.
                        </span>
                        <span class="font-mono text-sm font-black text-ink">
                          {order.orderNumber}
                        </span>
                      </div>
                      <Badge
                        variant={statusVariant[order.status] ?? "default"}
                        class="rotate-[-1deg]"
                      >
                        {statusLabel[order.status] ?? order.status}
                      </Badge>
                    </div>

                    {/* Order body */}
                    <div class="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-4">
                      <div>
                        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          Date
                        </p>
                        <p class="font-mono text-xs font-bold text-ink">
                          {formatDate(order.orderedAt)}
                        </p>
                      </div>
                      <div>
                        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          Total
                        </p>
                        <p class="font-mono text-xs font-black text-orange">
                          {formatMnt(order.totalMnt)}
                        </p>
                      </div>
                      <div>
                        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          Items
                        </p>
                        <p class="font-mono text-xs font-bold text-ink">{itemCount}ш</p>
                      </div>
                      <div class="flex items-center justify-end">
                        <span
                          class={cn(
                            "border-2 border-ink bg-ink px-3 py-1.5 font-mono text-micro font-black uppercase tracking-wider text-newsprint",
                          )}
                        >
                          Details →
                        </span>
                      </div>
                    </div>
                  </a>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </div>
  );
}
