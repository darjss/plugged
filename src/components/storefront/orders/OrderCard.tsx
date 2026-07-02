import { For, Show } from "solid-js";
import { formatDate, formatMnt } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { OrderItem, OrderPayment, OrderRow } from "@/types/order-types";
import { paymentStatusLabel, statusLabel, statusVariant } from "@/types/order-types";

/**
 * Shared order card for the profile order-history and public tracking
 * islands. With `detailsHref` it renders the compact linked card (header
 * strip + meta grid + "Details →"); without it, the expanded tracking
 * card with address, payment, and line items.
 */
export default function OrderCard(props: { order: OrderRow; detailsHref?: string }) {
  const order = () => props.order;
  const itemCount = () =>
    order().items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0);
  const itemCountLabel = () => `${itemCount()} ${itemCount() === 1 ? "item" : "items"}`;

  return (
    <Show
      when={props.detailsHref}
      fallback={
        <li class="border-2 border-ink bg-newsprint-2 shadow-hard-sm">
          <OrderCardHeader order={order()} />

          {/* Order meta */}
          <div class="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3">
            <OrderMeta label="Date" value={formatDate(order().orderedAt)} />
            <OrderMeta label="Total" value={formatMnt(order().totalMnt)} accent />
            <OrderMeta label="Items" value={itemCountLabel()} />
          </div>

          <OrderTrackingSections order={order()} />
        </li>
      }
    >
      {(href) => (
        <li class="border-2 border-ink bg-newsprint-2 shadow-hard-sm transition-all hover:-translate-y-[1px] hover:shadow-hard">
          <a href={href()} class="block">
            <OrderCardHeader order={order()} />

            {/* Order body */}
            <div class="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-4">
              <OrderMeta label="Date" value={formatDate(order().orderedAt)} />
              <OrderMeta label="Total" value={formatMnt(order().totalMnt)} accent />
              <OrderMeta label="Items" value={itemCountLabel()} />
              <div class="flex items-center justify-end">
                <span class="border-2 border-ink bg-ink px-3 py-1.5 font-mono text-micro font-black uppercase tracking-wider text-newsprint">
                  Details →
                </span>
              </div>
            </div>
          </a>
        </li>
      )}
    </Show>
  );
}

/** Header strip — order number + status badge. */
function OrderCardHeader(props: { order: OrderRow }) {
  return (
    <div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-newsprint-dark px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
          No.
        </span>
        <span class="font-mono text-sm font-black text-ink">{props.order.orderNumber}</span>
      </div>
      <Badge variant={statusVariant[props.order.status] ?? "default"} class="rotate-[-1deg]">
        {statusLabel[props.order.status] ?? props.order.status}
      </Badge>
    </div>
  );
}

function OrderMeta(props: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
        {props.label}
      </p>
      <p
        class={
          props.accent
            ? "font-mono text-xs font-black text-orange"
            : "font-mono text-xs font-bold text-ink"
        }
      >
        {props.value}
      </p>
    </div>
  );
}

/** Expanded sections for the tracking card: address, payment, line items. */
function OrderTrackingSections(props: { order: OrderRow }) {
  const order = () => props.order;
  const qpayPayment = () => order().payments.find((p: OrderPayment) => p.provider === "qpay");

  return (
    <>
      {/* Delivery address */}
      <div class="border-t-2 border-ink/30 px-4 py-3">
        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
          Delivery address
        </p>
        <p class="mt-1 font-mono text-xs font-bold text-ink">{order().address}</p>
      </div>

      {/* Payment status */}
      <Show when={qpayPayment()}>
        {(payment) => (
          <div class="border-t-2 border-ink/30 px-4 py-3">
            <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
              Payment (QPay)
            </p>
            <p class="mt-1 font-mono text-xs font-bold text-ink">
              {paymentStatusLabel[payment().status] ?? payment().status}
            </p>
          </div>
        )}
      </Show>

      {/* Items */}
      <Show when={order().items.length > 0}>
        <div class="border-t-2 border-ink/30 bg-newsprint px-4 py-3">
          <p class="mb-2 font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
            Items
          </p>
          <ul class="space-y-1.5">
            <For each={order().items}>
              {(item) => (
                <li class="flex items-center justify-between gap-2 font-mono text-xs text-ink">
                  <span class="truncate">
                    {item.productName} <span class="text-ink-muted">({item.variantName})</span>
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
    </>
  );
}
