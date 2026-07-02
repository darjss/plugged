import { Motion } from "@motionone/solid";
import { Minus, Plus, ShoppingBag, X } from "lucide-solid";
import { For, Show, createMemo } from "solid-js";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cart } from "@/store/cart";
import { cn, formatMnt } from "@/lib/utils";
import { springEasings, createPrefersReducedMotion } from "@/lib/motion";

/**
 * Cart drawer island. `client:only="solid-js"` so it never touches
 * localStorage during SSR. `transition:persist` is applied by the
 * parent layout so the drawer survives Astro View Transitions.
 *
 * Corvu handles the slide-in from the right edge; motion-one layers a
 * spring-based scale/rotation on the content so it lands with a physical
 * "stamp" feel per DESIGN.md (sharp ease-out, slight overshoot, no bounce).
 */
export default function CartDrawer() {
  const reduced = createPrefersReducedMotion();

  // Spring animation for the drawer content — snaps in with a tiny
  // overshoot. Skipped entirely under prefers-reduced-motion.
  const contentTransition = createMemo(() =>
    reduced() ? { duration: 0 } : { easing: springEasings.drawer },
  );

  return (
    <Drawer
      open={cart.isDrawerOpen()}
      onOpenChange={(open) => (open ? cart.openDrawer() : cart.closeDrawer())}
      side="right"
    >
      <DrawerContent class="flex h-full w-full max-w-sm flex-col bg-card p-0">
        <Motion.div
          initial={reduced() ? false : { scale: 0.96, rotate: -1 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={contentTransition()}
          class="flex h-full w-full flex-col"
        >
          <DrawerHeader class="flex flex-row items-center justify-between border-b-4 border-ink bg-hazard-stripes p-4">
            <DrawerTitle class="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
              <ShoppingBag class="size-5" />
              Your stash
            </DrawerTitle>
            <button
              type="button"
              onClick={() => cart.closeDrawer()}
              aria-label="Close cart"
              class="flex size-8 items-center justify-center border-2 border-ink bg-newsprint shadow-hard-sm transition-all hover:bg-pink hover:text-newsprint active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <X class="size-4" />
            </button>
          </DrawerHeader>

          {/* Items list */}
          <div class="flex-1 overflow-y-auto p-4">
            <Show
              when={cart.isHydrated() && cart.items().length > 0}
              fallback={
                <Show
                  when={cart.isHydrated()}
                  fallback={<div class="py-12 text-center text-muted-foreground">Loading...</div>}
                >
                  <div class="flex flex-col items-center gap-4 py-12">
                    <div class="flex size-16 items-center justify-center border-4 border-ink bg-newsprint-dark shadow-hard">
                      <ShoppingBag class="size-8 text-ink-muted" />
                    </div>
                    <p class="text-heading font-black uppercase tracking-tight text-ink">
                      Your cart is empty
                    </p>
                    <p class="text-sm text-muted-foreground">No pocket audio yet. Go find some.</p>
                    <Button
                      variant="default"
                      size="sm"
                      as="a"
                      href="/products"
                      onClick={() => cart.closeDrawer()}
                    >
                      Browse products
                    </Button>
                  </div>
                </Show>
              }
            >
              <ul class="flex flex-col gap-3">
                <For each={cart.items()}>
                  {(item) => (
                    <li class="flex gap-3 border-2 border-ink bg-newsprint p-3 shadow-hard-sm">
                      {/* Product image */}
                      <div class="size-16 shrink-0 overflow-hidden border-2 border-ink bg-newsprint-dark">
                        <img
                          src={item.image}
                          alt={item.name}
                          class="size-full object-cover"
                          style={{ filter: "grayscale(0.3) contrast(1.1)" }}
                        />
                      </div>

                      {/* Details */}
                      <div class="flex min-w-0 flex-1 flex-col gap-1">
                        <a
                          href={`/products/${item.slug}`}
                          onClick={() => cart.closeDrawer()}
                          class="truncate text-heading font-bold uppercase tracking-tight text-ink hover:text-orange"
                        >
                          {item.name}
                        </a>
                        <span class="font-mono text-caption font-bold text-muted-foreground">
                          {formatMnt(item.price)}
                        </span>

                        {/* Quantity controls */}
                        <div class="mt-auto flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => cart.updateQuantity(item.variantId, item.quantity - 1)}
                            aria-label={`Decrease ${item.name} quantity`}
                            class="flex size-7 items-center justify-center border-2 border-ink bg-newsprint shadow-hard-sm transition-all hover:bg-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                          >
                            <Minus class="size-3" />
                          </button>
                          <span class="min-w-6 text-center font-mono text-sm font-black">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => cart.updateQuantity(item.variantId, item.quantity + 1)}
                            disabled={
                              item.stockQuantity !== undefined &&
                              item.quantity >= item.stockQuantity
                            }
                            aria-label={`Increase ${item.name} quantity`}
                            class="flex size-7 items-center justify-center border-2 border-ink bg-newsprint shadow-hard-sm transition-all hover:bg-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-newsprint"
                          >
                            <Plus class="size-3" />
                          </button>
                          <Show
                            when={
                              item.stockQuantity !== undefined &&
                              item.quantity >= item.stockQuantity
                            }
                          >
                            <span class="font-mono text-micro font-black uppercase text-ink-muted">
                              max
                            </span>
                          </Show>
                          <button
                            type="button"
                            onClick={() => cart.remove(item.variantId)}
                            aria-label={`Remove ${item.name}`}
                            class="ml-auto text-caption font-black uppercase text-pink hover:text-orange"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Line total — stamp style */}
                      <div class="flex shrink-0 flex-col items-end justify-end">
                        <span class="rotate-2 border-2 border-ink bg-yellow px-2 py-1 font-mono text-caption font-black shadow-hard-sm">
                          {formatMnt(item.price * item.quantity)}
                        </span>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>

          {/* Footer — total + checkout */}
          <Show when={cart.isHydrated() && cart.items().length > 0}>
            <div class="border-t-4 border-ink bg-newsprint-dark p-4">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-heading font-black uppercase tracking-tight">Total</span>
                <span
                  class={cn(
                    "rotate-1 border-2 border-ink bg-pink px-3 py-1.5 font-mono text-heading font-black text-newsprint shadow-hard-sm",
                  )}
                >
                  {formatMnt(cart.total())}
                </span>
              </div>
              <Button
                variant="default"
                size="lg"
                as="a"
                href="/checkout"
                class="w-full"
                onClick={() => cart.closeDrawer()}
              >
                Checkout
              </Button>
            </div>
          </Show>
        </Motion.div>
      </DrawerContent>
    </Drawer>
  );
}
