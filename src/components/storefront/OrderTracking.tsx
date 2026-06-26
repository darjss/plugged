import { useQuery } from "@tanstack/solid-query";
import { createMemo, createSignal, For, Show } from "solid-js";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { cn, formatMnt, formatDate, MONGOLIAN_PHONE_REGEX } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitPriceMnt: number;
  quantity: number;
  lineTotalMnt: number;
  createdAt: Date;
};

type OrderPayment = {
  id: string;
  orderId: string;
  paymentNumber: string;
  provider: string;
  status: string;
  amountMnt: number;
  qpayInvoiceId: string | null;
  qpayQrText: string | null;
  qpayQrImage: string | null;
  qpayUrlsJson: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerPhone: string;
  customerName: string | null;
  status: string;
  subtotalMnt: number;
  deliveryFeeMnt: number;
  totalMnt: number;
  address: string;
  deliveryProvider: string;
  notes: string | null;
  checkoutToken: string;
  orderedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  items: OrderItem[];
  payments: OrderPayment[];
};

type OrdersResponse = { orders: OrderRow[] };

const statusVariant: Record<
  string,
  "default" | "stamp" | "success" | "warning" | "destructive" | "secondary"
> = {
  pending: "warning",
  shipped: "default",
  delivered: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

const statusLabel: Record<string, string> = {
  pending: "Хүлээгдэж буй",
  shipped: "Илгээгдсэн",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
  refunded: "Буцаан олгосон",
};

const paymentStatusLabel: Record<string, string> = {
  pending: "Хүлээгдэж буй",
  customer_claimed_paid: "Төлсөн гэж мэдэгдсэн",
  success: "Амжилттай",
  failed: "Амжилтгүй",
};

/**
 * Public order tracking by phone number. No login required — works for
 * guest checkouts. The user enters their 8-digit Mongolian phone, we
 * prepend `+976` and fetch `/orders?phone=`. Supports a `?phone=`
 * query-param prefill for deep links from the profile page.
 */
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
        const { data, error } = await api.orders.get({ query: { phone: p } });
        if (error) throw error;
        return data as unknown as OrdersResponse;
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
      {/* Search form — photocopied card */}
      <form
        onSubmit={handleSubmit}
        class="rotate-[-1deg] border-2 border-ink bg-newsprint-2 p-5 shadow-hard-lg"
        novalidate
      >
        <div class="space-y-3">
          <Label for="track-phone" class="text-orange">
            Утасны дугаар
          </Label>
          <div class="flex items-stretch gap-2">
            <span
              class={cn(
                "flex items-center border-2 border-ink bg-newsprint-dark px-3",
                "font-mono text-sm font-black text-ink shadow-hard-sm",
              )}
            >
              +976
            </span>
            <Input
              id="track-phone"
              type="tel"
              inputmode="numeric"
              autocomplete="tel-national"
              placeholder="88889999"
              maxlength={8}
              value={phoneDigits()}
              onInput={(e) => setPhoneDigits(e.currentTarget.value.replace(/\D/g, "").slice(0, 8))}
              class="font-mono text-lg tracking-wider"
              required
            />
          </div>
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

      {/* Results */}
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
            <div class="border-2 border-pink bg-pink/10 p-4 shadow-hard-sm">
              <p class="font-mono text-xs font-black uppercase text-pink">
                Захиалга татахад алдаа гарлаа. Дахин оролдоно уу.
              </p>
            </div>
          </Show>

          <Show when={ordersQuery.isSuccess && orders().length === 0}>
            <div class="border-2 border-ink bg-newsprint-2 p-8 text-center shadow-hard-sm">
              <p class="font-display text-2xl uppercase text-ink">Захиалга олдсонгүй</p>
              <p class="mt-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
                Энэ утасны дугаарт харгалзах захиалга алга байна
              </p>
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
                  const qpayPayment = order.payments.find(
                    (p: OrderPayment) => p.provider === "qpay",
                  );
                  return (
                    <li class="border-2 border-ink bg-newsprint-2 shadow-hard-sm">
                      {/* Order header */}
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

                      {/* Order meta */}
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

                      {/* Delivery address */}
                      <div class="border-t-2 border-ink/30 px-4 py-3">
                        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
                          Хүргэлтийн хаяг
                        </p>
                        <p class="mt-1 font-mono text-xs font-bold text-ink">{order.address}</p>
                      </div>

                      {/* Payment status */}
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

                      {/* Items */}
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
