import { useQuery } from "@tanstack/solid-query";
import { createMemo, createSignal, For, Show } from "solid-js";
import { api, unwrap } from "@/lib/eden";
import { queryClient } from "@/lib/query-client";
import { formatMnt, formatDate, MONGOLIAN_PHONE_REGEX } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PhoneInput from "./PhoneInput";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";
import type { OrderItem, OrderPayment, OrderRow, OrdersResponse } from "@/types/order-types";
import { paymentStatusLabel, statusLabel, statusVariant } from "@/types/order-types";

export default function OrderTracking(props: { initialPhone?: string }) {
  const initial = props.initialPhone ?? "";
  const initialFull =
    initial && MONGOLIAN_PHONE_REGEX.test(`+976${initial}`) ? `+976${initial}` : null;

  const [phoneDigits, setPhoneDigits] = createSignal(initial);
  const [submittedPhone, setSubmittedPhone] = createSignal<string | null>(initialFull);

  const fullPhone = () => `+976${phoneDigits()}`;
  const phoneValid = () => MONGOLIAN_PHONE_REGEX.test(fullPhone());

  const ordersQuery = useQuery(
    () => ({
      queryKey: ["track-orders", submittedPhone()],
      queryFn: async (): Promise<OrdersResponse> => {
        const p = submittedPhone();
        if (!p) return { orders: [] };
        return unwrap<OrdersResponse>(api.orders.get({ query: { phone: p } }));
      },
      enabled: Boolean(submittedPhone()),
    }),
    () => queryClient,
  );

  const orders = createMemo<OrderRow[]>(() => ordersQuery.data?.orders ?? []);

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!phoneValid()) return;
    setSubmittedPhone(fullPhone());
  }

  return (
    <div class="space-y-6">
      <form
        onSubmit={handleSubmit}
        class="rotate-[-1deg] border-2 border-ink bg-newsprint-2 p-5 shadow-hard-lg"
        novalidate
      >
        <div class="space-y-3">
          <Label for="track-phone" class="text-orange">
            Утасны дугаар
          </Label>
          <PhoneInput id="track-phone" value={phoneDigits()} onInput={setPhoneDigits} required />
          <p class="text-micro font-bold uppercase tracking-wider text-ink-muted">
            Захиалга хийсэн утасны дугаараа оруулна уу
          </p>
        </div>
        <Button
          type="submit"
          variant="default"
          size="lg"
          class="mt-4 w-full"
          disabled={!phoneValid()}
        >
          ЗАХИАЛГА ХАЙХ
        </Button>
      </form>

      <Show when={submittedPhone()}>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="h-6 w-1.5 bg-orange" aria-hidden="true"></div>
            <h2 class="font-display text-2xl uppercase text-ink">
              {submittedPhone()?.slice(4)} — захиалгууд
            </h2>
          </div>

          <Show when={ordersQuery.isPending}>
            <div class="border-2 border-ink bg-newsprint-2 p-8 text-center shadow-hard-sm">
              <p class="font-mono text-xs font-black uppercase tracking-widest text-ink-muted">
                Хайж байна…
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
              title="Захиалга олдсонгүй"
              message="Энэ утасны дугаарт харгалзах захиалга алга байна"
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
                  const qpayPayment = order.payments.find(
                    (p: OrderPayment) => p.provider === "qpay",
                  );
                  return (
                    <li class="border-2 border-ink bg-newsprint-2 shadow-hard-sm">
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

                      <div class="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3">
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
                      </div>

                      <div class="border-t-2 border-ink/30 px-4 py-3">
                        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          Хүргэлтийн хаяг
                        </p>
                        <p class="mt-1 font-mono text-xs font-bold text-ink">{order.address}</p>
                      </div>

                      <Show when={qpayPayment}>
                        <div class="border-t-2 border-ink/30 px-4 py-3">
                          <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                            Төлбөр (QPay)
                          </p>
                          <p class="mt-1 font-mono text-xs font-bold text-ink">
                            {paymentStatusLabel[qpayPayment!.status] ?? qpayPayment!.status}
                          </p>
                        </div>
                      </Show>

                      <Show when={order.items.length > 0}>
                        <div class="border-t-2 border-ink/30 bg-newsprint px-4 py-3">
                          <p class="mb-2 font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                            Бараанууд
                          </p>
                          <ul class="space-y-1.5">
                            <For each={order.items}>
                              {(item) => (
                                <li class="flex items-center justify-between gap-2 font-mono text-xs text-ink">
                                  <span class="truncate">
                                    {item.productName}{" "}
                                    <span class="text-ink-muted">({item.variantName})</span>
                                  </span>
                                  <span class="shrink-0 font-black">
                                    {item.quantity}× {formatMnt(item.unitPriceMnt)}
                                  </span>
                                </li>
                              )}
                            </For>
                          </ul>
                        </div>
                      </Show>
                    </li>
                  );
                }}
              </For>
            </ul>
          </Show>
        </div>
      </Show>
    </div>
  );
}
