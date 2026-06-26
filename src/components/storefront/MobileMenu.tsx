import { Menu, X } from "lucide-solid";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { cn } from "@/lib/utils";

/**
 * Mobile menu island. Replaces the vanilla `<script>` in Header.astro
 * that re-bound listeners on every `astro:page-load` (leaking
 * listeners against a `transition:persist` header). The island mounts
 * once on the persisted header and owns its open state as a signal;
 * no re-bind, no leak. Adds `aria-expanded`/`aria-controls` and
 * Escape-to-close for a11y.
 */
const NAV_LINKS = [
  { label: "IEMs", href: "/products?category=iems" },
  { label: "DAC amps", href: "/products?category=dac-amps" },
  { label: "Wireless", href: "/products?category=wireless" },
  { label: "All products", href: "/products" },
];

export default function MobileMenu() {
  const [open, setOpen] = createSignal(false);

  const close = () => setOpen(false);

  // Lock body scroll while the menu is open; restore on close/unmount.
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

  // Toggle body scroll lock based on open state.
  const toggleScrollLock = (locked: boolean) => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = locked ? "hidden" : "";
  };

  const openMenu = () => {
    setOpen(true);
    toggleScrollLock(true);
  };
  const closeMenu = () => {
    close();
    toggleScrollLock(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open()}
        aria-controls="mobile-menu"
        class="flex size-11 items-center justify-center border-2 border-ink bg-card shadow-hard-sm transition-all hover:bg-primary hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none md:hidden"
        onClick={openMenu}
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
              onClick={closeMenu}
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
                  onClick={closeMenu}
                >
                  {link.label}
                </a>
              )}
            </For>
            <a
              href="/auth/sign-in"
              class="border-2 border-ink bg-orange px-4 py-4 text-heading font-black uppercase tracking-tight text-ink shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none -rotate-1"
              onClick={closeMenu}
            >
              Sign in
            </a>
            <a
              href="/track"
              class="border-2 border-ink bg-card px-4 py-4 text-heading font-black uppercase tracking-tight shadow-hard-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rotate-1"
              onClick={closeMenu}
            >
              Track order
            </a>
          </nav>
        </div>
      </Show>
    </>
  );
}
