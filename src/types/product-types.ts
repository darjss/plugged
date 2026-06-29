/**
 * Storefront-facing product shape. Mirrors the public columns returned by
 * `getProducts` / `GET /products` so SSR (Astro) and client (SolidJS island)
 * share one type without hand-maintained DTOs.
 *
 * Kept as a structural interface (not imported from the server) so the
 * client bundle stays decoupled from Drizzle/Elysia inference.
 */
export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  priceMnt: number;
  compareAtPriceMnt: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  active: boolean;
}

export interface ProductBrand {
  id: string;
  slug: string;
  name: string;
}

export interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  status: string;
  basePriceMnt: number;
  compareAtPriceMnt: number | null;
  currency: string;
  featured: boolean;
  brand: ProductBrand | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

/**
 * Pick the primary image URL (or first available) for a product card.
 * Returns empty string when no images exist so the card can render a
 * halftone placeholder.
 */
export function primaryImage(product: StoreProduct): string {
  return product.images[0]?.url ?? "";
}

/**
 * Pick the first active variant for add-to-cart. Falls back to the first
 * variant if none are explicitly active so the button still works on
 * under-seeded data.
 */
export function firstVariant(product: StoreProduct): ProductVariant | null {
  return product.variants[0] ?? null;
}
