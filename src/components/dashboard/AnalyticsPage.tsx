import { createResource, For, Show, type JSX } from "solid-js";
import { BarChart3, DollarSign, GitFork } from "lucide-solid";
import { cn, formatMnt } from "@/lib/utils";
import { adminAnalyticsApi, type AnalyticsPoint } from "@/lib/admin-api";

const EVENT_LABELS: Record<string, string> = {
  $pageview: "Pageviews",
  product_viewed: "Product views",
  cart_add: "Cart adds",
  checkout_started: "Checkouts",
  order_completed: "Orders",
};

function total(points: AnalyticsPoint[]) {
  return points.reduce((sum, point) => sum + point.value, 0);
}

function Panel(props: { title: string; icon: typeof BarChart3; children: JSX.Element }) {
  return (
    <section class="border-2 border-ink bg-card p-5 shadow-hard-lg">
      <div class="mb-4 flex items-center gap-2 border-b-2 border-ink pb-2">
        <props.icon class="size-5 text-orange" />
        <h2 class="font-display text-2xl uppercase leading-none text-ink">{props.title}</h2>
      </div>
      {props.children}
    </section>
  );
}

function Bars(props: { points: AnalyticsPoint[]; money?: boolean }) {
  const max = () => Math.max(1, ...props.points.map((point) => point.value));
  return (
    <Show
      when={props.points.length > 0}
      fallback={<p class="font-mono text-sm text-muted-foreground">No PostHog rows yet.</p>}
    >
      <div class="flex h-48 items-end gap-1 border-2 border-ink bg-newsprint p-3">
        <For each={props.points}>
          {(point) => (
            <div class="group flex min-w-3 flex-1 flex-col items-center gap-1">
              <div
                class="w-full border-2 border-ink bg-orange shadow-hard-sm"
                style={{ height: `${Math.max(4, (point.value / max()) * 100)}%` }}
                title={`${point.date}: ${props.money ? formatMnt(point.value) : point.value}`}
              />
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}

export default function AnalyticsPage() {
  const [overview] = createResource(() => adminAnalyticsApi.overview());

  return (
    <div class="flex flex-col gap-6">
      <div class="border-4 border-ink bg-newsprint-2 p-6 shadow-hard-lg">
        <p class="font-mono text-micro font-black uppercase tracking-[0.25em] text-orange">
          PostHog / last 30 days
        </p>
        <h1 class="mt-1 font-display text-5xl uppercase leading-none text-ink">Analytics</h1>
        <Show when={overview() && !overview()!.configured}>
          <p class="mt-3 border-2 border-ink bg-yellow px-3 py-2 font-mono text-xs text-ink shadow-hard-sm">
            Analytics not configured. Connect PostHog to see traffic and conversion data.
          </p>
        </Show>
      </div>

      <Show
        when={overview()}
        fallback={
          <div class="border-2 border-ink bg-card p-5 font-mono text-sm shadow-hard">Loading…</div>
        }
      >
        {(data) => (
          <>
            <div class="grid gap-4 md:grid-cols-3">
              <div class="border-2 border-ink bg-card p-4 shadow-hard-sm">
                <p class="font-mono text-micro font-black uppercase text-muted-foreground">
                  Traffic
                </p>
                <p class="font-display text-4xl uppercase text-ink">{total(data().traffic)}</p>
              </div>
              <div class="border-2 border-ink bg-card p-4 shadow-hard-sm">
                <p class="font-mono text-micro font-black uppercase text-muted-foreground">
                  Orders
                </p>
                <p class="font-display text-4xl uppercase text-ink">
                  {data().funnel.find((step) => step.event === "order_completed")?.count ?? 0}
                </p>
              </div>
              <div class="border-2 border-ink bg-card p-4 shadow-hard-sm">
                <p class="font-mono text-micro font-black uppercase text-muted-foreground">
                  Revenue
                </p>
                <p class="font-display text-4xl uppercase text-ink">
                  {formatMnt(total(data().revenue))}
                </p>
              </div>
            </div>

            <div class="grid gap-6 xl:grid-cols-2">
              <Panel title="Traffic trend" icon={BarChart3}>
                <Bars points={data().traffic} />
              </Panel>
              <Panel title="Revenue trend" icon={DollarSign}>
                <Bars points={data().revenue} money />
              </Panel>
            </div>

            <Panel title="Conversion funnel" icon={GitFork}>
              <div class="flex flex-col gap-2">
                <For each={data().funnel}>
                  {(step, index) => {
                    const max = () => Math.max(1, data().funnel[0]?.count ?? 0);
                    return (
                      <div class="grid gap-2 md:grid-cols-[160px_1fr_80px] md:items-center">
                        <span class="font-mono text-xs font-black uppercase text-ink">
                          {index() + 1}. {EVENT_LABELS[step.event] ?? step.event}
                        </span>
                        <div class="h-7 border-2 border-ink bg-newsprint">
                          <div
                            class={cn("h-full bg-orange")}
                            style={{ width: `${Math.max(2, (step.count / max()) * 100)}%` }}
                          />
                        </div>
                        <span class="font-mono text-sm font-black text-ink">{step.count}</span>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Panel>
          </>
        )}
      </Show>
    </div>
  );
}
