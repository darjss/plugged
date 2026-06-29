import { useQuery } from "@tanstack/solid-query";
import { createMemo, For, Show } from "solid-js";
import { api, unwrap } from "@/lib/eden";
import { queryClient } from "@/lib/query-client";
import { authClient } from "@/lib/auth-client";
import { cn, formatMnt, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";
import type { OrderItem, OrderRow, OrdersResponse } from "@/types/order-types";
import { statusLabel, statusVariant } from "@/types/order-types";

export default function OrderHistory() {
  const session = authClient.useSession();
  const phone = () => session()?.data?.user?.phoneNumber ?? null;

  const ordersQuery = useQuery(
    () => ({
      queryKey: ["orders", phone()],
      queryFn: async (): Promise<OrdersResponse> => {
        const p = phone();
        if (!p) return { orders: [] };
        return unwrap<OrdersResponse>(api.orders.get({ query: { phone: p } }));
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
            Захиалгуудыг ачаалж байна…
          </p>
        </div>
      </Show>

      <Show when={ordersQuery.isError}>
        <ErrorState
          title="Татахад алдаа"
          message="Захиалга татахад алдаа гарлаа. Сүлжээний асуудал байж магадгүй — дахин оролдоно уу."
          onRetry={() => void ordersQuery.refetch()}
          isFetching={ordersQuery.isFetching}
        />
      </Show>

      <Show when={ordersQuery.isSuccess && orders().length === 0}>
        <EmptyState
          title="Захиалга алга"
          message="Та одоохондоо ямар ч захиалга хийгээгүй байна"
          action={
            <a
              href="/products"
              class="inline-block border-2 border-ink bg-orange px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-ink shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Бүтээгдэхүүн үзэх →
            </a>
          }
        />
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
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-newsprint-dark px-4 py-3">
                      <div class="flex items-center gap-3">
                        <span class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          №
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

                    <div class="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-4">
                      <div>
                        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          Огноо
                        </p>
                        <p class="font-mono text-xs font-bold text-ink">
                          {formatDate(order.orderedAt)}
                        </p>
                      </div>
                      <div>
                        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          Нийт
                        </p>
                        <p class="font-mono text-xs font-black text-orange">
                          {formatMnt(order.totalMnt)}
                        </p>
                      </div>
                      <div>
                        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          Бараа
                        </p>
                        <p class="font-mono text-xs font-bold text-ink">{itemCount}ш</p>
                      </div>
                      <div class="flex items-center justify-end">
                        <span
                          class={cn(
                            "border-2 border-ink bg-ink px-3 py-1.5 font-mono text-micro font-black uppercase tracking-wider text-newsprint",
                          )}
                        >
                          Дэлгэрэнгүй →
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
