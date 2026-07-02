import { Menu, X } from "lucide-solid";
import { createSignal, For, onCleanup, onMount } from "solid-js";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/nav-links";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";

/**
 * Mobile menu island, built on the Kobalte Dialog primitive (same one
 * `src/components/ui/dialog.tsx` gives every other overlay in the app) so
 * focus trap, focus restore, and Escape-to-close come for free instead of
 * being hand-rolled. Previously this was a bare `role="dialog"
 * aria-modal` `<div>` toggled by a signal with none of that — Tab could
 * walk focus out into the page behind it, and closing didn't return
 * focus to the trigger.
 *
 * `DialogContent`'s default styling is a centered card; it's overridden
 * here to a full-screen panel (`fixed inset-0 ... md:hidden`) to keep
 * the exact prior visual design. The prior version had no open/close
 * animation (an instant `<Show>` toggle) — Kobalte's presence layer
 * defaults to the same instant mount/unmount when no CSS transition is
 * defined, so behavior is unchanged.
 */
export default function MobileMenu() {
  const [open, setOpen] = createSignal(false);

  const close = () => setOpen(false);

  // The header (and this island with it) is `transition:persist`, so a
  // page swap that doesn't go through a menu link's `onClick={close}`
  // (browser back/forward, programmatic navigation) must still close the
  // menu — otherwise the next page loads with it stuck open.
  onMount(() => {
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

      <Dialog open={open()} onOpenChange={setOpen}>
        <DialogContent
          id="mobile-menu"
          showCloseButton={false}
          aria-label="Mobile navigation"
          class="left-0 top-0 flex h-full max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col border-0 bg-newsprint bg-noise shadow-none md:hidden"
        >
          <div class="flex items-center justify-between border-b-4 border-ink bg-hazard-stripes p-4">
            <span class="font-display text-2xl font-black uppercase tracking-tight text-ink">
              Menu
            </span>
            <DialogClose
              aria-label="Close menu"
              class="flex size-10 items-center justify-center border-2 border-ink bg-newsprint shadow-hard-sm"
            >
              <X class="size-5" />
            </DialogClose>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
