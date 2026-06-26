import { env } from "cloudflare:workers";

/**
 * R2 helpers for product images.
 *
 * Images are stored in the `BUCKET` R2 binding under `products/<id>/<uuid>.<ext>`
 * and served publicly via the `/img/*` worker route (see `src/server/api/app.ts`).
 * The `productImage.url` column stores the public path (`/img/<key>`), so the
 * storefront and admin share one URL space and never need a signed CDN config.
 */

const PUBLIC_IMAGE_PREFIX = "/img";

export function publicUrlForR2Key(r2Key: string): string {
  return `${PUBLIC_IMAGE_PREFIX}/${r2Key}`;
}

export async function putProductImage(
  productId: string,
  file: { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
): Promise<{ r2Key: string; url: string; contentType: string; size: number }> {
  const ext = inferExtension(file.name, file.type);
  const id = crypto.randomUUID().replace(/-/g, "");
  const r2Key = `products/${productId}/${id}.${ext}`;
  const buffer = await file.arrayBuffer();

  await env.BUCKET.put(r2Key, buffer, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  return {
    r2Key,
    url: publicUrlForR2Key(r2Key),
    contentType: file.type || "application/octet-stream",
    size: buffer.byteLength,
  };
}

export async function deleteR2Object(r2Key: string): Promise<void> {
  await env.BUCKET.delete(r2Key);
}

export async function getR2Object(r2Key: string) {
  return env.BUCKET.get(r2Key);
}

function inferExtension(name: string, contentType: string): string {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,4}$/.test(fromName)) return fromName;
  if (contentType.includes("png")) return "png";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "bin";
}
