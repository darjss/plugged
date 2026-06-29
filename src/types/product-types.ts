// Hand-written because Eden infers the success body as `unknown` due to the
// server's dynamic `.onError()` status codes (see src/lib/api-client.ts).
// The shapes mirror the public columns returned by `getProducts` /
// `GET /products` so SSR (Astro) and client (SolidJS island) share one type.

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

export function primaryImage(product: StoreProduct): string {
  return product.images[0]?.url ?? "";
}

export function firstVariant(product: StoreProduct): ProductVariant | null {
  return product.variants[0] ?? null;
}
