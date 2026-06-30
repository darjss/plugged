import { api } from "@/lib/api-client";

/**
 * Admin product data-access helpers. Wraps the Eden Treaty client for
 * typed query/mutation keys, and uses a raw `fetch` for multipart image
 * uploads (Eden Treaty's multipart support is unreliable for `File` bodies).
 */

export const adminProductKeys = {
  all: ["admin", "products"] as const,
  list: (filters: AdminProductListFilters) => ["admin", "products", "list", filters] as const,
  detail: (id: string) => ["admin", "products", "detail", id] as const,
  brands: ["admin", "brands"] as const,
  categories: ["admin", "categories"] as const,
};

export type AdminProductListFilters = {
  brandId?: string | null;
  categoryId?: string | null;
  status?: "draft" | "active" | "archived" | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

export type AdminBrand = { id: string; slug: string; name: string };
export type AdminCategory = { id: string; slug: string; name: string };

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

async function unwrap<TOut>(
  call: Promise<{ data: unknown; error: { value: unknown } | null }>,
): Promise<TOut> {
  const { data, error } = await call;
  if (error || data === null || data === undefined) {
    const message =
      error && typeof error === "object" && "message" in (error as Record<string, unknown>)
        ? String((error as Record<string, unknown>).message)
        : "Request failed";
    throw new Error(message);
  }
  // Cast: Eden infers `Date` for timestamp columns and full relation rows;
  // our view types are a structural subset used by the UI. Runtime shape is
  // compatible (components tolerate Date | string via formatting helpers).
  return data as TOut;
}

export const adminProductsApi = {
  async list(filters: AdminProductListFilters): Promise<AdminProductList> {
    // Omit empty/null filter params instead of sending "" — the backend
    // `adminListProductsSchema` uses `v.optional(v.nullable(...))` which
    // rejects empty strings. Only send params that have values.
    const query = {
      limit: filters.limit ?? 25,
      offset: filters.offset ?? 0,
      ...(filters.brandId && { brandId: filters.brandId }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.search && { search: filters.search }),
    };
    return unwrap<AdminProductList>(api.admin.products.get({ query }));
  },

  async get(id: string): Promise<AdminProductDetail> {
    return unwrap<AdminProductDetail>(api.admin.products({ id }).get());
  },

  async create(input: AdminProductInput): Promise<AdminProductDetail> {
    return unwrap<AdminProductDetail>(api.admin.products.post(input));
  },

  async update(id: string, input: Partial<AdminProductInput>): Promise<AdminProductDetail> {
    return unwrap<AdminProductDetail>(api.admin.products({ id }).patch(input));
  },

  async archive(id: string): Promise<AdminProductDetail> {
    return unwrap<AdminProductDetail>(api.admin.products({ id }).delete());
  },

  async listBrands(): Promise<AdminBrand[]> {
    return unwrap<AdminBrand[]>(api.admin.brands.get());
  },

  async listCategories(): Promise<AdminCategory[]> {
    return unwrap<AdminCategory[]>(api.admin.categories.get());
  },

  async uploadImage(productId: string, file: File): Promise<AdminProductImage> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        body && typeof body === "object" && "error" in body
          ? String((body as Record<string, unknown>).error)
          : `Upload failed (${res.status})`;
      throw new Error(message);
    }
    return (await res.json()) as AdminProductImage;
  },

  async deleteImage(productId: string, imageId: string): Promise<{ ok: boolean }> {
    return unwrap<{ ok: boolean }>(
      api.admin.products({ id: productId }).images({ imageId }).delete(),
    );
  },
};

export type AdminSessionUser = { name: string; email: string; image: string | null };

export const adminSessionKeys = {
  detail: ["admin", "session"] as const,
};

export const adminSessionApi = {
  async me(): Promise<AdminSessionUser | null> {
    const { data, error } = await api.dashboard.session.get();
    if (error || !data) return null;
    // Eden treaty infers dashboard/session as the error shape (the
    // success body is too deep for route-tree inference). Cast at the
    // fetch boundary — documented escape hatch.
    const user = (data as { user?: AdminSessionUser }).user;
    return user ?? null;
  },
};

export type AnalyticsPoint = { date: string; value: number };
type FunnelStep = { event: string; count: number };
type AnalyticsOverview = {
  configured: boolean;
  traffic: AnalyticsPoint[];
  funnel: FunnelStep[];
  revenue: AnalyticsPoint[];
};

export const adminAnalyticsApi = {
  async overview(): Promise<AnalyticsOverview> {
    return unwrap<AnalyticsOverview>(api.admin.analytics.overview.get());
  },
};
