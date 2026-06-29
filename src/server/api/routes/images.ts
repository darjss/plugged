import { Elysia } from "elysia";
import { getR2Object } from "../../commerce/r2";

export const imageRoutes = new Elysia({ name: "image-routes" }).get(
  "/img/*",
  async ({ params, status }) => {
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
  },
);
