import { Elysia, t } from "elysia";
import {
  adminCreateProductSchema,
  adminListProductsSchema,
  adminProductQueries,
  adminUpdateProductSchema,
} from "../../admin";
import { getR2Object } from "../../commerce/r2";
import {
  indexProduct,
  rebuildSearchIndex,
  removeProductFromIndex,
} from "../../search/index-builder";
import { authPlugin } from "../plugins/auth";
import { parseInput } from "../validation";

/**
 * Admin product management routes. All guarded by `requireAdmin`
 * (macro provided by `authPlugin`). Image upload uses Elysia's Typebox
 * `t.File()` so multipart parsing kicks in; the rest of the admin surface
 * validates with Valibot via `parseInput`.
 */
export const adminRoutes = new Elysia({ name: "admin-routes" })
  .use(authPlugin)
  .get("/admin/brands", () => adminProductQueries.listBrands(), {
    requireAdmin: true,
  })
  .get("/admin/categories", () => adminProductQueries.listCategories(), {
    requireAdmin: true,
  })
  .get(
    "/admin/products",
    ({ query }) => {
      const filters = parseInput(adminListProductsSchema, {
        ...query,
        limit: query.limit ? Number(query.limit) : undefined,
        offset: query.offset ? Number(query.offset) : undefined,
      });
      return adminProductQueries.listProducts(filters);
    },
    { requireAdmin: true },
  )
  .get("/admin/products/:id", ({ params }) => adminProductQueries.getProduct(params.id), {
    requireAdmin: true,
  })
  .post(
    "/admin/products",
    async ({ body }) => {
      const input = parseInput(adminCreateProductSchema, body);
      const result = await adminProductQueries.createProduct(input);
      await syncProductSearchIndex(result.id);
      return result;
    },
    { requireAdmin: true },
  )
  .patch(
    "/admin/products/:id",
    async ({ params, body }) => {
      const input = parseInput(adminUpdateProductSchema, body);
      const result = await adminProductQueries.updateProduct(params.id, input);
      await syncProductSearchIndex(result.id);
      return result;
    },
    { requireAdmin: true },
  )
  .delete(
    "/admin/products/:id",
    async ({ params }) => {
      const result = await adminProductQueries.archiveProduct(params.id);
      await removeProductFromSearchIndex(params.id);
      return result;
    },
    { requireAdmin: true },
  )
  .post("/admin/search/reindex", () => rebuildSearchIndex(), { requireAdmin: true })
  .post(
    "/admin/products/:id/images",
    async ({ params, body, status }) => {
      const file = body.file;
      if (!file) {
        return status(400, {
          error: { code: "validation-error", message: "Missing 'file' field" },
        });
      }
      return adminProductQueries.uploadImage(params.id, {
        name: file.name,
        type: file.type,
        arrayBuffer: () => file.arrayBuffer(),
      });
    },
    {
      requireAdmin: true,
      body: t.Object({
        file: t.File(),
      }),
    },
  )
  .delete(
    "/admin/products/:id/images/:imageId",
    ({ params }) => adminProductQueries.deleteImage(params.id, params.imageId),
    { requireAdmin: true },
  )
  /* === Public R2 image proxy ===
   * Serves product images stored in the `BUCKET` binding under their r2Key.
   * Public (no auth) so storefront <img> tags work without a CDN. */
  .get("/img/*", async ({ params, status }) => {
    const r2Key = params["*"];
    if (!r2Key) {
      return status(404, {
        error: { code: "not-found", message: "Image not found" },
      });
    }

    const object = await getR2Object(r2Key);
    if (!object) {
      return status(404, {
        error: { code: "not-found", message: "Image not found" },
      });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("ETag", object.httpEtag);

    return new Response(object.body, { headers });
  });

async function syncProductSearchIndex(productId: string) {
  try {
    await indexProduct(productId);
  } catch (error) {
    console.warn("search index sync failed", { productId, error: String(error) });
  }
}

async function removeProductFromSearchIndex(productId: string) {
  try {
    await removeProductFromIndex(productId);
  } catch (error) {
    console.warn("search index delete failed", { productId, error: String(error) });
  }
}
