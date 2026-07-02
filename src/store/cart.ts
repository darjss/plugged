import { makePersisted } from "@solid-primitives/storage";
import { createMemo, createRoot, createSignal } from "solid-js";
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
  /**
   * Available units (stock minus reservations) at the time the item was
   * added — caps add/increment. Optional: carts persisted before this
   * field existed have no cap.
   */
  stockQuantity?: number;
}

function trackCartItemEvent(event: "cart_add" | "cart_remove", item: CartItem) {
  trackAnalytics(event, {
    ...cartAnalyticsProperties(),
    product_slug: item.slug,
    variant: item.variantName ?? item.variantId,
    variant_id: item.variantId,
    quantity: item.quantity,
    price: item.price,
  });
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

  // Client-only hydration flip. This module also evaluates during SSR
  // (isHydrated stays false there), so guard on `window`; the microtask
  // defers the flip past the first synchronous client render so hydrated
  // islands initially match the server output — no SSR mismatch.
  if (typeof window !== "undefined") {
    queueMicrotask(() => setIsHydrated(true));
  }

  const total = createMemo(() =>
    cartStore.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
  );

  const count = createMemo(() => cartStore.items.reduce((acc, item) => acc + item.quantity, 0));

  const remove = (variantId: string) => {
    const item = cartStore.items.find((i) => i.variantId === variantId);
    if (item) trackCartItemEvent("cart_remove", item);
    setCart("items", (items) => items.filter((i) => i.variantId !== variantId));
  };

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
        // Merge into the existing line, capped at the freshest known
        // available stock for the variant.
        const cap = item.stockQuantity ?? cartStore.items[index]!.stockQuantity;
        setCart("items", index, (existing) => ({
          ...existing,
          quantity:
            cap !== undefined
              ? Math.min(existing.quantity + item.quantity, cap)
              : existing.quantity + item.quantity,
          stockQuantity: item.stockQuantity ?? existing.stockQuantity,
        }));
      } else {
        const quantity =
          item.stockQuantity !== undefined
            ? Math.min(item.quantity, item.stockQuantity)
            : item.quantity;
        setCart("items", cartStore.items.length, { ...item, quantity });
      }
      trackCartItemEvent("cart_add", item);
      setIsDrawerOpen(true);
    },

    remove,

    updateQuantity: (variantId: string, quantity: number) => {
      if (quantity <= 0) {
        remove(variantId);
        return;
      }
      const item = cartStore.items.find((i) => i.variantId === variantId);
      const next =
        item?.stockQuantity !== undefined ? Math.min(quantity, item.stockQuantity) : quantity;
      setCart("items", (i) => i.variantId === variantId, "quantity", next);
    },

    clearCart: () => setCart("items", []),

    total,
    count,
  };
});
