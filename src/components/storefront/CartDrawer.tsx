import { Minus, Plus, ShoppingBag, X } from "lucide-solid";
import { For, onMount, Show } from "solid-js";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cart } from "@/store/cart";
import { cn, formatMnt } from "@/lib/utils";

/**
 * Cart drawer island. `client:only="solid-js"` so it never touches
 * localStorage during SSR. The drawer renders through a Solid
 * `<Portal>` into `document.body`, so it is NOT wrapped in
 * `transition:persist` (persisting the wrapper would keep the empty
 * shell while the portaled overlay/panel get torn down on swap,
 * wedging the user). Instead we close the drawer on `astro:before-swap`
 * so the next page starts with a clean state.
 */
export default function CartDrawer() {
  onMount(() => {
    document.addEventListener("astro:before-swap", () => cart.closeDrawer());
  });

  return (
    <Drawer
      open={cart.isDrawerOpen()}
      onOpenChange={(open) => (open ? cart.openDrawer() : cart.closeDrawer())}
      side="right"
    >
      <DrawerContent class="flex h-full w-full max-w-sm flex-col bg-card p-0">
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
                          aria-label={`Increase ${item.name} quantity`}
                          class="flex size-7 items-center justify-center border-2 border-ink bg-newsprint shadow-hard-sm transition-all hover:bg-orange active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                        >
                          <Plus class="size-3" />
                        </button>
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
      </DrawerContent>
    </Drawer>
  );
}
