// Hand-written because Eden infers the success body as `unknown` due to the
// server's dynamic `.onError()` status codes (see src/lib/api-client.ts).
// The shapes mirror the admin API responses (`/admin/products`, etc.) so
// the dashboard React views share one type without re-deriving from Drizzle.

export type AdminBrand = { id: string; slug: string; name: string };
export type AdminCategory = { id: string; slug: string; name: string };

export type AdminProductListFilters = {
  brandId?: string | null;
  categoryId?: string | null;
  status?: "draft" | "active" | "archived" | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

export type AdminProductListItem = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "active" | "archived";
  basePriceMnt: number;
  compareAtPriceMnt: number | null;
  featured: boolean;
  createdAt: string;
  brand: { id: string; name: string } | null;
  thumbnail: string | null;
  stock: number;
  variantCount: number;
};

export type AdminProductList = {
  items: AdminProductListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminProductVariant = {
  id?: string;
  sku: string;
  name: string;
  priceMnt: number;
  compareAtPriceMnt: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminProductImage = {
  id: string;
  productId: string;
  r2Key: string | null;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
};

export type AdminIemSpec = {
  productId: string;
  driverType: string | null;
  driverConfig: string | null;
  impedanceOhms: number | null;
  sensitivityDb: string | null;
  frequencyResponse: string | null;
  connector: string | null;
  cable: string | null;
  mic: boolean | null;
  shellMaterial: string | null;
  nozzleMaterial: string | null;
  soundSignature: string | null;
  fit: string | null;
  includedAccessories: string | null;
  squiglinkFile: string | null;
};

export type AdminProductDetail = {
  id: string;
  slug: string;
  brandId: string | null;
  name: string;
  shortDescription: string | null;
  description: string | null;
  status: "draft" | "active" | "archived";
  basePriceMnt: number;
  compareAtPriceMnt: number | null;
  currency: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  brand: AdminBrand | null;
  categories: { category: AdminCategory }[];
  categoryIds: string[];
  iemSpec: AdminIemSpec | null;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
};

export type AdminProductInput = {
  name: string;
  slug: string;
  brandId?: string | null;
  categoryIds?: string[];
  shortDescription?: string | null;
  description?: string | null;
  basePriceMnt: number;
  compareAtPriceMnt?: number | null;
  status: "draft" | "active" | "archived";
  featured?: boolean;
  variants?: Array<Omit<AdminProductVariant, "reservedQuantity" | "createdAt" | "updatedAt">>;
  iemSpec?: Partial<AdminIemSpec> | null;
};

export type AdminSessionUser = { name: string; email: string; image: string | null };

export type AnalyticsPoint = { date: string; value: number };

export type AnalyticsOverview = {
  configured: boolean;
  traffic: AnalyticsPoint[];
  funnel: { event: string; count: number }[];
  revenue: AnalyticsPoint[];
};
