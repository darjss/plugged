import { Elysia, t } from "elysia";
import {
  adminCreateProductSchema,
  adminListProductsSchema,
  adminProductQueries,
  adminUpdateProductSchema,
} from "../../admin";
import { rebuildSearchIndex } from "../../search/index-builder";
import { authPlugin } from "../plugins/auth";
import { parseInput } from "../validation";

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
      return adminProductQueries.createProduct(input);
    },
    { requireAdmin: true },
  )
  .patch(
    "/admin/products/:id",
    async ({ params, body }) => {
      const input = parseInput(adminUpdateProductSchema, body);
      return adminProductQueries.updateProduct(params.id, input);
    },
    { requireAdmin: true },
  )
  .delete("/admin/products/:id", ({ params }) => adminProductQueries.archiveProduct(params.id), {
    requireAdmin: true,
  })
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
  );
