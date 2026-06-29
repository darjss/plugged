import { Show } from "solid-js";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry: () => void;
  isFetching: boolean;
  variant?: "card" | "flyer";
  kicker?: string;
  retryLabel?: string;
  retryingLabel?: string;
}

export default function ErrorState(props: ErrorStateProps) {
  const variant = () => props.variant ?? "card";
  const retryLabel = () => props.retryLabel ?? "↻ Дахин оролдох";
  const retryingLabel = () => props.retryingLabel ?? "ТАТАЖ БАЙНА…";

  return (
    <Show
      when={variant() === "flyer"}
      fallback={
        <div class="flex flex-col gap-3 border-2 border-ink bg-pink p-4 shadow-hard-sm">
          <div class="flex items-center gap-2">
            <span class="rotate-[-2deg] border-2 border-ink bg-newsprint px-2 py-0.5 font-mono text-micro font-black uppercase tracking-wider text-pink shadow-hard-sm">
              Error
            </span>
            <span class="font-display text-lg font-black uppercase tracking-tight text-newsprint">
              {props.title}
            </span>
          </div>
          <p class="font-mono text-xs font-bold text-newsprint/90">{props.message}</p>
          <RetryButton
            onRetry={props.onRetry}
            isFetching={props.isFetching}
            retryLabel={retryLabel()}
            retryingLabel={retryingLabel()}
          />
        </div>
      }
    >
      <div class="flex flex-col items-center gap-6 py-20 text-center">
        <div
          class="relative rotate-1 border-4 border-ink bg-pink px-8 py-10 shadow-hard"
          style={{ "clip-path": "polygon(2% 0, 98% 3%, 100% 92%, 4% 100%)" }}
        >
          <div class="flex items-center justify-center gap-2">
            <span class="rotate-[-3deg] border-2 border-ink bg-newsprint px-2 py-0.5 font-mono text-micro font-black uppercase tracking-wider text-pink shadow-hard-sm">
              Error
            </span>
            <Show when={props.kicker}>
              <p class="text-micro font-black uppercase tracking-widest text-newsprint">
                {props.kicker}
              </p>
            </Show>
          </div>
          <h2 class="mt-2 font-display text-display font-black uppercase leading-none tracking-tight text-newsprint">
            {props.title}
          </h2>
          <p class="mt-3 max-w-sm text-body text-newsprint/90">{props.message}</p>
          <RetryButton
            onRetry={props.onRetry}
            isFetching={props.isFetching}
            retryLabel={retryLabel()}
            retryingLabel={retryingLabel()}
            class="mt-5 px-6 py-3"
          />
        </div>
      </div>
    </Show>
  );
}

function RetryButton(props: {
  onRetry: () => void;
  isFetching: boolean;
  retryLabel: string;
  retryingLabel: string;
  class?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => props.onRetry()}
      disabled={props.isFetching}
      class={cn(
        "inline-flex items-center justify-center gap-2 border-2 border-ink bg-hazard-stripes px-5 py-3 font-display text-sm font-black uppercase tracking-wide text-ink shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50",
        props.class,
      )}
    >
      {props.isFetching ? props.retryingLabel : props.retryLabel}
    </button>
  );
}
