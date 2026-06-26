import { useQuery } from "@tanstack/solid-query";
import { createMemo, For, Show } from "solid-js";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { authClient } from "@/lib/auth-client";
import { cn, formatMnt, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Order line item shape returned by `/orders?phone=`. Matches the Drizzle
 * `orderItem` row. Inferred from the Elysia route via Eden Treaty, but we
 * declare a local alias so query callbacks stay readable.
 */
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
            Захиалгуудыг ачаалж байна…
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
          <p class="font-display text-2xl uppercase text-ink">Захиалга алга</p>
          <p class="mt-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
            Та одоохондоо ямар ч захиалга хийгээгүй байна
          </p>
          <a
            href="/products"
            class="mt-4 inline-block border-2 border-ink bg-orange px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-ink shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Бүтээгдэхүүн үзэх →
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

                    {/* Order body */}
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
