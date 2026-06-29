import { onMount } from "solid-js";
import { cart } from "@/store/cart";

export default function ClearCart() {
  onMount(() => {
    cart.clearCart();
  });
  return null;
}
