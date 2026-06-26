import { onMount } from "solid-js";
import { cart } from "@/store/cart";

/**
 * Tiny island that clears the client-side cart store on mount. Used on the
 * order confirmation page so a successful purchase doesn't leave stale items
 * in localStorage. `client:only` to avoid touching localStorage during SSR.
 */
export default function ClearCart() {
  onMount(() => {
    cart.clearCart();
  });
  return null;
}
