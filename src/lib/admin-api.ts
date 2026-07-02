import type { Treaty } from "@elysiajs/eden";
import { api, unwrap } from "@/lib/api-client";

export { unwrap } from "@/lib/api-client";

/**
 * Admin product data-access helpers. Wraps the Eden Treaty client for
 * typed query/mutation keys, and uses a raw `fetch` for multipart image
 * uploads (Eden Treaty's multipart support is unreliable for `File` bodies).
 *
 * Response types are derived from Eden Treaty inference so they track the
 * server's Drizzle-inferred shapes. Timestamp fields are `Date`: Eden's
 * default `parseDate` revives ISO strings on the client, matching the
 * server-side types.
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

export type AdminBrand = Treaty.Data<typeof api.admin.brands.get>[number];
export type AdminCategory = Treaty.Data<typeof api.admin.categories.get>[number];

export type AdminProductList = Treaty.Data<typeof api.admin.products.get>;
export type AdminProductListItem = AdminProductList["items"][number];

export type AdminProductDetail = Treaty.Data<ReturnType<typeof api.admin.products>["get"]>;
export type AdminProductImage = AdminProductDetail["images"][number];
export type AdminIemSpec = NonNullable<AdminProductDetail["iemSpec"]>;

/**
 * Variant shape for the product form. Kept structural (not derived from
 * the response) because create-flow variants have no `id`/timestamps yet.
 */
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

/**
 * Request body for create/update product. Hand-written client contract:
 * the route validates with valibot inside the handler (standard-schema
 * route options are broken under aot:false), so Eden types the body as
 * unknown and cannot derive this.
 */
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
    return unwrap(api.admin.products.get({ query }));
  },

  async get(id: string): Promise<AdminProductDetail> {
    return unwrap(api.admin.products({ id }).get());
  },

  async create(input: AdminProductInput): Promise<AdminProductDetail> {
    return unwrap(api.admin.products.post(input));
  },

  async update(id: string, input: Partial<AdminProductInput>): Promise<AdminProductDetail> {
    return unwrap(api.admin.products({ id }).patch(input));
  },

  async archive(id: string): Promise<AdminProductDetail> {
    return unwrap(api.admin.products({ id }).delete());
  },

  async listBrands(): Promise<AdminBrand[]> {
    return unwrap(api.admin.brands.get());
  },

  async listCategories(): Promise<AdminCategory[]> {
    return unwrap(api.admin.categories.get());
  },

  // Raw-fetch return shape: exactly what the upload route returns. Not
  // derived (multipart bypasses Eden) and not AdminProductImage — the
  // route returns no `productId`/`alt`/`createdAt`.
  async uploadImage(
    productId: string,
    file: File,
  ): Promise<{ id: string; r2Key: string; url: string; isPrimary: boolean; sortOrder: number }> {
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
    return (await res.json()) as {
      id: string;
      r2Key: string;
      url: string;
      isPrimary: boolean;
      sortOrder: number;
    };
  },

  async deleteImage(productId: string, imageId: string): Promise<{ ok: boolean }> {
    return unwrap(api.admin.products({ id: productId }).images({ imageId }).delete());
  },
};

export type AdminSessionUser = NonNullable<Treaty.Data<typeof api.dashboard.session.get>["user"]>;

export const adminSessionKeys = {
  detail: ["admin", "session"] as const,
};

export const adminSessionApi = {
  async me(): Promise<AdminSessionUser | null> {
    const { data, error } = await api.dashboard.session.get();
    if (error || !data) return null;
    return data.user ?? null;
  },
};

export type AnalyticsOverview = Treaty.Data<typeof api.admin.analytics.overview.get>;
export type AnalyticsPoint = AnalyticsOverview["traffic"][number];

export const adminAnalyticsApi = {
  async overview(): Promise<AnalyticsOverview> {
    return unwrap(api.admin.analytics.overview.get());
  },
};
