import { Show, type JSX } from "solid-js";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: JSX.Element;
  icon?: JSX.Element;
  children?: JSX.Element;
  variant?: "card" | "icon" | "flyer";
}

export default function EmptyState(props: EmptyStateProps) {
  const variant = () => props.variant ?? "card";

  return (
    <Show
      when={variant() === "icon"}
      fallback={
        <Show
          when={variant() === "flyer"}
          fallback={
            <div class="border-2 border-ink bg-newsprint-2 p-8 text-center shadow-hard-sm">
              <p class="font-display text-2xl uppercase text-ink">{props.title}</p>
              <p class="mt-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
                {props.message}
              </p>
              <Show when={props.action}>
                <div class="mt-4">{props.action}</div>
              </Show>
            </div>
          }
        >
          <FlyerEmpty title={props.title} message={props.message}>
            {props.children}
            {props.action}
          </FlyerEmpty>
        </Show>
      }
    >
      <div class="flex flex-col items-center gap-4 py-12">
        <Show when={props.icon}>
          <div class="flex size-16 items-center justify-center border-4 border-ink bg-newsprint-dark shadow-hard">
            {props.icon}
          </div>
        </Show>
        <p class="text-heading font-black uppercase tracking-tight text-ink">{props.title}</p>
        <p class="text-sm text-muted-foreground">{props.message}</p>
        <Show when={props.action}>{props.action}</Show>
      </div>
    </Show>
  );
}

function FlyerEmpty(props: { title: string; message: string; children?: JSX.Element }) {
  return (
    <div class="flex flex-col items-center gap-6 py-20 text-center">
      <div
        class="relative -rotate-2 border-4 border-ink bg-newsprint-2 px-8 py-10 shadow-hard"
        style={{ "clip-path": "polygon(2% 0, 98% 3%, 100% 92%, 4% 100%)" }}
      >
        <p class="text-micro font-black uppercase tracking-widest text-orange">Empty wall</p>
        <h2 class="mt-2 font-display text-display font-black uppercase leading-none tracking-tight text-ink">
          {props.title}
        </h2>
        <p class="mt-3 max-w-sm text-body text-ink-muted">{props.message}</p>
        {props.children}
      </div>
    </div>
  );
}
