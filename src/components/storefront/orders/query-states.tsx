import type { JSX } from "solid-js";
import { Show } from "solid-js";

/** Grunge loading card shared by the order-history and tracking islands. */
export function OrdersLoading(props: { label: string }) {
  return (
    <div class="border-2 border-ink bg-newsprint-2 p-8 text-center shadow-hard-sm">
      <p class="font-mono text-xs font-black uppercase tracking-widest text-ink-muted">
        {props.label}
      </p>
    </div>
  );
}

/** Fetch-error card with a hazard-striped retry button. */
export function OrdersError(props: { onRetry: () => void; isFetching: boolean }) {
  return (
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
        onClick={() => props.onRetry()}
        disabled={props.isFetching}
        class="inline-flex items-center justify-center gap-2 border-2 border-ink bg-hazard-stripes px-5 py-3 font-display text-sm font-black uppercase tracking-wide text-ink shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50"
      >
        {props.isFetching ? "LOADING…" : "↻ Retry"}
      </button>
    </div>
  );
}

/** Empty-results card; optional action slot (e.g. "Browse products →"). */
export function OrdersEmpty(props: { title: string; description: string; action?: JSX.Element }) {
  return (
    <div class="border-2 border-ink bg-newsprint-2 p-8 text-center shadow-hard-sm">
      <p class="font-display text-2xl uppercase text-ink">{props.title}</p>
      <p class="mt-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
        {props.description}
      </p>
      <Show when={props.action}>{props.action}</Show>
    </div>
  );
}
