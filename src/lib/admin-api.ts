import { api } from "@/lib/api-client";
import { unwrap } from "@/lib/eden";
import type {
  AdminBrand,
  AdminCategory,
  AnalyticsOverview,
  AdminProductDetail,
  AdminProductImage,
  AdminProductInput,
  AdminProductList,
  AdminProductListFilters,
  AdminSessionUser,
} from "@/types/admin-types";

export type {
  AdminBrand,
  AdminCategory,
  AnalyticsOverview,
  AnalyticsPoint,
  AdminProductDetail,
  AdminProductImage,
  AdminProductInput,
  AdminProductList,
  AdminProductListItem,
  AdminProductListFilters,
  AdminProductVariant,
  AdminSessionUser,
} from "@/types/admin-types";

export const adminProductKeys = {
  all: ["admin", "products"] as const,
  list: (filters: AdminProductListFilters) => ["admin", "products", "list", filters] as const,
  detail: (id: string) => ["admin", "products", "detail", id] as const,
  brands: ["admin", "brands"] as const,
  categories: ["admin", "categories"] as const,
};

export const adminProductsApi = {
  async list(filters: AdminProductListFilters): Promise<AdminProductList> {
    return unwrap<AdminProductList>(
      api.admin.products.get({
        query: {
          brandId: filters.brandId ?? "",
          categoryId: filters.categoryId ?? "",
          status: filters.status ?? "",
          search: filters.search ?? "",
          limit: filters.limit ?? 25,
          offset: filters.offset ?? 0,
        },
      }),
    );
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

  // Eden Treaty's multipart support is unreliable for `File` bodies, so use
  // a raw `fetch` for image uploads.
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

export const adminSessionKeys = {
  detail: ["admin", "session"] as const,
};

export const adminSessionApi = {
  async me(): Promise<AdminSessionUser | null> {
    const { data, error } = await api.dashboard.session.get();
    if (error || !data) return null;
    // Eden infers dashboard/session as `unknown` (see src/lib/eden.ts), so
    // cast at the fetch boundary.
    const user = (data as { user?: AdminSessionUser }).user;
    return user ?? null;
  },
};

export const adminAnalyticsApi = {
  async overview(): Promise<AnalyticsOverview> {
    return unwrap<AnalyticsOverview>(api.admin.analytics.overview.get());
  },
};
