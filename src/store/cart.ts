import { makePersisted } from "@solid-primitives/storage";
import { createEffect, createMemo, createRoot, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { cartAnalyticsProperties, trackAnalytics } from "@/lib/analytics";

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  variantName?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

/**
 * Safe localStorage wrapper that no-ops on the server and swallows
 * SecurityError / QuotaExceededError so privacy mode and full storage
 * don't crash the cart.
 */
const safeStorage: Storage = {
  getItem: (key) => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {}
  },
  clear: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.clear();
    } catch {}
  },
  get length() {
    if (typeof window === "undefined") return 0;
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  },
  key: (index) => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  },
};

/**
 * Module-level cart store. SolidJS `createRoot` detaches the reactive
 * graph from any component lifecycle so every island that imports this
 * module shares the same signals.
 *
 * `isHydrated` stays false on the server and during the first client
 * render, then flips true via a microtask. Cart-dependent UI gates on
 * it to avoid SSR / localStorage hydration mismatch.
 */
export const cart = createRoot(() => {
  const [isHydrated, setIsHydrated] = createSignal(false);
  const [isDrawerOpen, setIsDrawerOpen] = createSignal(false);

  const [cartStore, setCart] = makePersisted(createStore<CartState>({ items: [] }), {
    name: "plugged-cart",
    storage: safeStorage,
  });

  // createEffect runs in the browser only (no-op during SSR). The
  // microtask delay pushes isHydrated past the first paint so the
  // initial client render matches the server output.
  createEffect(() => {
    queueMicrotask(() => setIsHydrated(true));
  });

  const total = createMemo(() =>
    cartStore.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
  );

  const count = createMemo(() => cartStore.items.reduce((acc, item) => acc + item.quantity, 0));

  return {
    items: () => cartStore.items,
    isHydrated: () => isHydrated(),
    isDrawerOpen: () => isDrawerOpen(),
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
    toggleDrawer: () => setIsDrawerOpen((prev) => !prev),

    add: (item: CartItem) => {
      const index = cartStore.items.findIndex((i) => i.variantId === item.variantId);
      if (index !== -1) {
        setCart("items", index, "quantity", (q) => q + item.quantity);
      } else {
        setCart("items", cartStore.items.length, item);
      }
      trackAnalytics("cart_add", {
        ...cartAnalyticsProperties(),
        product_slug: item.slug,
        variant: item.variantName ?? item.variantId,
        variant_id: item.variantId,
        quantity: item.quantity,
        price: item.price,
      });
      setIsDrawerOpen(true);
    },

    remove: (variantId: string) => {
      const item = cartStore.items.find((i) => i.variantId === variantId);
      if (item) {
        trackAnalytics("cart_remove", {
          ...cartAnalyticsProperties(),
          product_slug: item.slug,
          variant: item.variantName ?? item.variantId,
          variant_id: item.variantId,
          quantity: item.quantity,
          price: item.price,
        });
      }
      setCart("items", (items) => items.filter((i) => i.variantId !== variantId));
    },

    updateQuantity: (variantId: string, quantity: number) => {
      if (quantity <= 0) {
        const item = cartStore.items.find((i) => i.variantId === variantId);
        if (item) {
          trackAnalytics("cart_remove", {
            ...cartAnalyticsProperties(),
            product_slug: item.slug,
            variant: item.variantName ?? item.variantId,
            variant_id: item.variantId,
            quantity: item.quantity,
            price: item.price,
          });
        }
        setCart("items", (items) => items.filter((i) => i.variantId !== variantId));
        return;
      }
      setCart("items", (item) => item.variantId === variantId, "quantity", quantity);
    },

    clearCart: () => setCart("items", []),

    total,
    count,
  };
});
