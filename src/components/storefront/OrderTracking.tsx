import { createMemo, createSignal, For, Show } from "solid-js";
import { cn, MONGOLIAN_PHONE_REGEX } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrderRow } from "@/types/order-types";
import OrderCard from "./orders/OrderCard";
import { createOrdersByPhoneQuery } from "./orders/orders-query";
import { OrdersEmpty, OrdersError, OrdersLoading } from "./orders/query-states";

/**
 * Public order tracking by phone number. No login required — works for
 * guest checkouts. The user enters their 8-digit Mongolian phone, we
 * prepend `+976` and fetch `/orders?phone=` via the shared orders-by-phone
 * query. Supports a `?phone=` query-param prefill for deep links.
 */
export default function OrderTracking(props: { initialPhone?: string }) {
  const initial = props.initialPhone ?? "";
  const initialFull =
    initial && MONGOLIAN_PHONE_REGEX.test(`+976${initial}`) ? `+976${initial}` : undefined;

  const [phoneDigits, setPhoneDigits] = createSignal(initial);
  const [submittedPhone, setSubmittedPhone] = createSignal<string | undefined>(initialFull);

  const fullPhone = () => `+976${phoneDigits()}`;
  const phoneValid = () => MONGOLIAN_PHONE_REGEX.test(fullPhone());

  const ordersQuery = createOrdersByPhoneQuery(submittedPhone);

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
            Phone number
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
            Enter the phone number you used at checkout
          </p>
        </div>
        <Button
          type="submit"
          variant="default"
          size="lg"
          class="mt-4 w-full"
          disabled={!phoneValid()}
        >
          FIND ORDERS
        </Button>
      </form>

      {/* Results */}
      <Show when={submittedPhone()}>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="h-6 w-1.5 bg-orange" aria-hidden="true"></div>
            <h2 class="font-display text-2xl uppercase text-ink">
              {submittedPhone()?.slice(4)} — orders
            </h2>
          </div>

          <Show when={ordersQuery.isPending}>
            <OrdersLoading label="Searching…" />
          </Show>

          <Show when={ordersQuery.isError}>
            <OrdersError
              onRetry={() => void ordersQuery.refetch()}
              isFetching={ordersQuery.isFetching}
            />
          </Show>

          <Show when={ordersQuery.isSuccess && orders().length === 0}>
            <OrdersEmpty title="No orders found" description="No orders match this phone number" />
          </Show>

          <Show when={orders().length > 0}>
            <ul class="space-y-4">
              <For each={orders()}>{(order) => <OrderCard order={order} />}</For>
            </ul>
          </Show>
        </div>
      </Show>
    </div>
  );
}
