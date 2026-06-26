import { ShoppingCart } from "lucide-solid";
import { Show } from "solid-js";

import { cart } from "@/store/cart";
import { cn } from "@/lib/utils";

/**
 * Header cart button. Reads count from the cart store and opens the
 * drawer on click. `client:idle` so the SSR output shows count 0 and
 * the real count appears after hydration without mismatch.
 */
export default function CartButton() {
  return (
    <button
      type="button"
      onClick={() => cart.openDrawer()}
      aria-label={`Cart, ${cart.count()} items`}
      class={cn(
        "relative flex size-11 items-center justify-center border-2 border-ink bg-card shadow-hard-sm",
        "transition-all hover:bg-primary hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
        "active:translate-x-[2px] active:translate-y-[2px]",
      )}
    >
      <ShoppingCart class="size-5" />
      <Show when={cart.isHydrated() && cart.count() > 0}>
        <span
          class="absolute -right-2 -top-2 flex min-w-5 items-center justify-center bg-pink px-1 text-micro font-black text-newsprint border-2 border-ink shadow-hard-sm"
          style={{ "font-size": "0.7rem" }}
        >
          {cart.count()}
        </span>
      </Show>
    </button>
  );
}
