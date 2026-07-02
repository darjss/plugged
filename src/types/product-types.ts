import type { Treaty } from "@elysiajs/eden";
import type { api } from "@/lib/api-client";

/**
 * Storefront-facing product shape, derived from the Eden Treaty response
 * for `GET /products` so SSR (Astro) and client (SolidJS islands) share
 * the server's inferred shape (Drizzle relational rows) without a
 * hand-maintained DTO. Type-only import — no server code reaches the
 * client bundle.
 */
export type StoreProduct = Treaty.Data<typeof api.products.get>["products"][number];
export type ProductImage = StoreProduct["images"][number];
export type ProductVariant = StoreProduct["variants"][number];
export type ProductBrand = NonNullable<StoreProduct["brand"]>;

/**
 * Pick the primary image URL (or first available) for a product card.
 * Returns empty string when no images exist so the card can render a
 * halftone placeholder.
 */
export function primaryImage(product: StoreProduct): string {
  return product.images[0]?.url ?? "";
}

/** Units actually available for a variant (stock minus reservations). */
export function variantAvailableStock(variant: ProductVariant): number {
  return Math.max(0, variant.stockQuantity - variant.reservedQuantity);
}

/**
 * A product is sold out only when EVERY variant is out of stock (the
 * storefront API already filters variants to active ones). Products with
 * no variants at all are treated as sold out.
 */
export function isSoldOut(product: StoreProduct): boolean {
  return product.variants.every((variant) => variantAvailableStock(variant) <= 0);
}

/**
 * Variant to target for quick add-to-cart: the first IN-STOCK variant,
 * falling back to the first variant (mirrors ProductBuyBox auto-select).
 */
export function firstInStockVariant(product: StoreProduct): ProductVariant | null {
  return (
    product.variants.find((variant) => variantAvailableStock(variant) > 0) ??
    product.variants[0] ??
    null
  );
}
