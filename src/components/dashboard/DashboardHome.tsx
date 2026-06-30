import { createQuery } from "@tanstack/solid-query";
import { A } from "@solidjs/router";
import { AlertTriangle, Box, Clock, TrendingUp } from "lucide-solid";
import { For, Match, Show, Switch, type Component, type JSX } from "solid-js";
import { api } from "@/lib/api-client";
import { cn, formatMnt } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { paymentStatuses } from "@/server/db/schema";
import { orderStatusBadgeVariant, paymentStatusBadgeVariant } from "@/lib/order-badges";

type PaymentStatus = (typeof paymentStatuses)[number];

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: Component<{ class?: string }>;
  /** Grunge accent: which flyer color stamps the card. */
  accent: "orange" | "pink" | "yellow" | "cyan";
  /** Slight rotation in degrees for the taped-flyer feel. */
  rotate?: number;
};

const ACCENT_BAR: Record<StatCardProps["accent"], string> = {
  orange: "bg-orange",
  pink: "bg-pink",
  yellow: "bg-yellow",
  cyan: "bg-cyan",
};

const ACCENT_ICON: Record<StatCardProps["accent"], string> = {
  orange: "text-orange",
  pink: "text-pink",
  yellow: "text-ink",
  cyan: "text-cyan",
};

function StatCard(props: StatCardProps) {
  return (
    <div
      class={cn(
        "relative border-4 border-ink bg-card p-5 shadow-hard-lg",
        "flex flex-col gap-3 transition-transform hover:translate-y-[-2px]",
      )}
      style={{ transform: `rotate(${props.rotate ?? 0}deg)` }}
    >
      {/* Tape strip holding the card to the wall */}
      <div
        class={cn(
          "bg-tape absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-[-3deg]",
          "border-x border-ink/10 shadow-sm",
        )}
        aria-hidden
      />
      {/* Accent color bar — hazard stamp */}
      <div class={cn("h-2 w-full", ACCENT_BAR[props.accent])} />
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <span class="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground">
            {props.label}
          </span>
          <span class="font-display text-4xl uppercase leading-none text-ink">{props.value}</span>
          <Show when={props.hint}>
            <span class="font-mono text-xs text-muted-foreground">{props.hint}</span>
          </Show>
        </div>
        <div
          class={cn(
            "flex size-10 shrink-0 items-center justify-center border-2 border-ink bg-newsprint",
            ACCENT_ICON[props.accent],
          )}
        >
          <props.icon class="size-5" />
        </div>
      </div>
    </div>
  );
}

function SectionShell(props: { title: string; href?: string; children: JSX.Element }) {
  return (
    <section class="flex flex-col gap-3">
      <div class="flex items-baseline justify-between gap-3 border-b-2 border-ink pb-1">
        <h2 class="font-display text-2xl uppercase leading-none text-ink">{props.title}</h2>
        <Show when={props.href}>
          <A
            href={props.href!}
            class="font-mono text-xs uppercase tracking-wide text-orange hover:text-orange-dark"
          >
            View all →
          </A>
        </Show>
      </div>
      {props.children}
    </section>
  );
}

const DashboardHome: Component = () => {
  const stats = createQuery(() => ({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const { data, error } = await api.admin.stats.get();
      if (error) throw error;
      return data;
    },
  }));

  const recentOrders = createQuery(() => ({
    queryKey: ["admin", "orders", "recent", 10],
    queryFn: async () => {
      const { data, error } = await api.admin.orders.get({ query: { limit: "10" } });
      if (error) throw error;
      // The `/admin/orders` route dispatches to the full filtered-list
      // handler, which returns `{ orders, total, limit, offset }` with each
      // order carrying a singular `payment` object (not a `payments` array).
      return data.orders;
    },
  }));

  const lowStock = createQuery(() => ({
    queryKey: ["admin", "products", "low-stock"],
    queryFn: async () => {
      const { data, error } = await api.admin.products["low-stock"].get();
      if (error) throw error;
      return data;
    },
  }));

  // The flat admin order list attaches a single primary `payment` object
  // (the most recently updated payment) per order, not a `payments` array.
  const primaryPaymentStatus = (payment: { status: PaymentStatus } | null): PaymentStatus | null =>
    payment?.status ?? null;

  return (
    <div class="mx-auto flex max-w-6xl flex-col gap-8">
      <div class="flex flex-col gap-1">
        <span class="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Today · {new Date().toISOString().slice(0, 10)}
        </span>
        <h1 class="font-display text-4xl uppercase leading-none text-ink md:text-5xl">
          Store overview
        </h1>
      </div>

      {/* Stat cards — taped flyers on the wall */}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Switch>
          <Match when={stats.data}>
            {(s) => (
              <>
                <StatCard
                  label="Today's orders"
                  value={String(s().todayOrderCount)}
                  icon={Box}
                  accent="orange"
                  rotate={-1}
                />
                <StatCard
                  label="Today's revenue"
                  value={formatMnt(s().todayRevenue)}
                  icon={TrendingUp}
                  accent="cyan"
                  rotate={1}
                />
                <StatCard
                  label="Pending orders"
                  value={String(s().pendingOrderCount)}
                  hint="Awaiting shipment"
                  icon={Clock}
                  accent="yellow"
                  rotate={-1}
                />
                <StatCard
                  label="Low stock"
                  value={String(s().lowStockCount)}
                  hint="Variants below 5 units"
                  icon={AlertTriangle}
                  accent="pink"
                  rotate={1}
                />
              </>
            )}
          </Match>
          <Match when={stats.isLoading}>
            <div class="col-span-full font-mono text-sm text-muted-foreground">Loading stats…</div>
          </Match>
          <Match when={stats.isError}>
            <div class="col-span-full border-2 border-pink bg-pink/10 p-3 font-mono text-sm text-pink">
              Failed to load stats.
            </div>
          </Match>
        </Switch>
      </div>

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent orders — spans 2 cols on desktop */}
        <div class="lg:col-span-2">
          <SectionShell title="Recent orders" href="/orders">
            <Show
              when={recentOrders.data}
              fallback={
                <Show
                  when={recentOrders.isLoading}
                  fallback={
                    <div class="border-2 border-pink bg-pink/10 p-3 font-mono text-sm text-pink">
                      Failed to load orders.
                    </div>
                  }
                >
                  <div class="font-mono text-sm text-muted-foreground">Loading orders…</div>
                </Show>
              }
            >
              {(orders) => (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead class="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <For each={orders()}>
                      {(row) => {
                        const payStatus = primaryPaymentStatus(row.payment);
                        return (
                          <TableRow>
                            <TableCell>
                              <A
                                href={`/orders/${row.orderNumber}`}
                                class="font-mono text-sm text-ink underline-offset-4 hover:text-orange hover:underline"
                              >
                                {row.orderNumber}
                              </A>
                            </TableCell>
                            <TableCell class="text-muted-foreground">{row.customerPhone}</TableCell>
                            <TableCell>
                              <Badge variant={orderStatusBadgeVariant[row.status]}>
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Show
                                when={payStatus}
                                fallback={
                                  <span class="font-mono text-xs text-muted-foreground">—</span>
                                }
                              >
                                {(status) => (
                                  <Badge variant={paymentStatusBadgeVariant[status()]}>
                                    {status()}
                                  </Badge>
                                )}
                              </Show>
                            </TableCell>
                            <TableCell class="text-right font-mono">
                              {formatMnt(row.totalMnt)}
                            </TableCell>
                          </TableRow>
                        );
                      }}
                    </For>
                  </TableBody>
                </Table>
              )}
            </Show>
          </SectionShell>
        </div>

        {/* Low stock alerts — 1 col */}
        <div>
          <SectionShell title="Low stock alerts" href="/products">
            <Show
              when={lowStock.data}
              fallback={
                <Show
                  when={lowStock.isLoading}
                  fallback={
                    <div class="border-2 border-pink bg-pink/10 p-3 font-mono text-sm text-pink">
                      Failed to load low stock.
                    </div>
                  }
                >
                  <div class="font-mono text-sm text-muted-foreground">Loading stock…</div>
                </Show>
              }
            >
              {(items) => (
                <Show
                  when={items().length > 0}
                  fallback={
                    <div class="border-2 border-ink bg-card p-4 font-mono text-sm text-muted-foreground">
                      All variants stocked above threshold.
                    </div>
                  }
                >
                  <ul class="flex flex-col gap-3">
                    <For each={items()}>
                      {(item) => (
                        <li>
                          <A
                            href={`/products/${item.productSlug}`}
                            class={cn(
                              "block border-2 border-ink bg-card p-3 shadow-hard-sm",
                              "transition-transform hover:translate-y-[-1px] hover:shadow-hard",
                            )}
                          >
                            <div class="flex items-start justify-between gap-2">
                              <div class="min-w-0 flex flex-col">
                                <span class="truncate font-heading text-sm uppercase text-ink">
                                  {item.productName}
                                </span>
                                <span class="truncate font-mono text-xs text-muted-foreground">
                                  {item.variantName} · {item.sku}
                                </span>
                              </div>
                              <Badge variant="stamp">{item.stockQuantity} left</Badge>
                            </div>
                          </A>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              )}
            </Show>
          </SectionShell>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
