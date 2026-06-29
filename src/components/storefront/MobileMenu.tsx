import { Menu, X } from "lucide-solid";
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/nav-links";

/**
 * Mobile menu island. Replaces the vanilla `<script>` in Header.astro
 * that re-bound listeners on every `astro:page-load` (leaking
 * listeners against a `transition:persist` header). The island mounts
 * once on the persisted header and owns its open state as a signal;
 * no re-bind, no leak. Adds `aria-expanded`/`aria-controls` and
 * Escape-to-close for a11y.
 */

export default function MobileMenu() {
  const [open, setOpen] = createSignal(false);

  const close = () => setOpen(false);

  // Lock body scroll while the menu is open. Driven from a single
  // createEffect keyed on `open()` so every close path — Escape,
  // astro:before-swap, link click, X button — releases the scroll
  // lock. The previous code had separate `closeMenu`/`close` helpers;
  // Escape used `close()` which didn't clear `body.style.overflow`,
  // leaving the page scroll-locked.
  createEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open() ? "hidden" : "";
    // Restore on cleanup so HMR / unmount doesn't leave the page
    // scroll-locked.
    onCleanup(() => {
      if (typeof document !== "undefined") document.body.style.overflow = "";
    });
  });

  onMount(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));

    // Close on Astro View Transition swap so the next page doesn't
    // start with the menu open and scroll locked.
    document.addEventListener("astro:before-swap", close);
    onCleanup(() => document.removeEventListener("astro:before-swap", close));
  });

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open()}
        aria-controls="mobile-menu"
        class="flex size-11 items-center justify-center border-2 border-ink bg-card shadow-hard-sm transition-all hover:bg-primary hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none md:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu class="size-5" />
      </button>

      <Show when={open()}>
        <div
          id="mobile-menu"
          class="fixed inset-0 z-50 flex flex-col bg-newsprint bg-noise md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div class="flex items-center justify-between border-b-4 border-ink bg-hazard-stripes p-4">
            <span class="font-display text-2xl font-black uppercase tracking-tight text-ink">
              Menu
            </span>
            <button
              type="button"
              aria-label="Close menu"
              class="flex size-10 items-center justify-center border-2 border-ink bg-newsprint shadow-hard-sm"
              onClick={close}
            >
              <X class="size-5" />
            </button>
          </div>
          <nav class="flex flex-col gap-2 p-4" aria-label="Mobile primary">
            <For each={NAV_LINKS}>
              {(link, i) => (
                <a
                  href={link.href}
                  class={cn(
                    "border-2 border-ink bg-card px-4 py-4 text-heading font-black uppercase tracking-tight shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                    i() % 2 === 0 ? "-rotate-1" : "rotate-1",
                  )}
                  onClick={close}
                >
                  {link.label}
                </a>
              )}
            </For>
            <a
              href="/auth/sign-in"
              class="border-2 border-ink bg-orange px-4 py-4 text-heading font-black uppercase tracking-tight text-ink shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none -rotate-1"
              onClick={close}
            >
              Sign in
            </a>
            <a
              href="/track"
              class="border-2 border-ink bg-card px-4 py-4 text-heading font-black uppercase tracking-tight shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rotate-1"
              onClick={close}
            >
              Track order
            </a>
          </nav>
        </div>
      </Show>
    </>
  );
}
