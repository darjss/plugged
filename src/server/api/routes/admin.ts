import { Elysia, t } from "elysia";
import { adminCommerceQueries } from "../../commerce/admin-queries";
import { getR2Object } from "../../commerce/r2";
import {
  adminCreateProductSchema,
  adminListProductsSchema,
  adminUpdateProductSchema,
} from "../../commerce/validation";
import { authPlugin } from "../plugins/auth";
import { parseInput } from "../validation";

/**
 * Admin product management routes (#14). All guarded by `requireAdmin`
 * (macro provided by `authPlugin`). Image upload uses Elysia's Typebox
 * `t.File()` so multipart parsing kicks in; the rest of the admin surface
 * validates with Valibot via `parseInput`.
 */
export const adminRoutes = new Elysia({ name: "admin-routes" })
  .use(authPlugin)
  .get("/admin/brands", () => adminCommerceQueries.listBrands(), {
    requireAdmin: true,
  })
  .get("/admin/categories", () => adminCommerceQueries.listCategories(), {
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
      return adminCommerceQueries.listProducts(filters);
    },
    { requireAdmin: true },
  )
  .get("/admin/products/:id", ({ params }) => adminCommerceQueries.getProduct(params.id), {
    requireAdmin: true,
  })
  .post(
    "/admin/products",
    ({ body }) => {
      const input = parseInput(adminCreateProductSchema, body);
      return adminCommerceQueries.createProduct(input);
    },
    { requireAdmin: true },
  )
  .patch(
    "/admin/products/:id",
    ({ params, body }) => {
      const input = parseInput(adminUpdateProductSchema, body);
      return adminCommerceQueries.updateProduct(params.id, input);
    },
    { requireAdmin: true },
  )
  .delete("/admin/products/:id", ({ params }) => adminCommerceQueries.archiveProduct(params.id), {
    requireAdmin: true,
  })
  .post(
    "/admin/products/:id/images",
    async ({ params, body, status }) => {
      const file = body.file;
      if (!file) {
        return status(400, {
          error: { code: "validation-error", message: "Missing 'file' field" },
        });
      }
      return adminCommerceQueries.uploadImage(params.id, {
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
    ({ params }) => adminCommerceQueries.deleteImage(params.id, params.imageId),
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
