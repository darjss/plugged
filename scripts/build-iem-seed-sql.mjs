import { readFileSync } from "node:fs";

const sourcePath = new URL("../iem-yangkeduo-prices-en.json", import.meta.url);
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const yuanToMnt = 500;

// Slugs flagged as featured on the homepage. Curated mix across price tiers
// and product types (entry IEMs, mid IEMs, wireless, DAC). Keep in sync with
// the production D1 `product.featured` flags.
const featuredSlugs = new Set([
  "moondrop-chu-2",
  "7hz-x-crinacle-zero-2",
  "truthear",
  "tangzu-waner-2-red-lion",
  "simgot-ew100p",
  "dunu-titan-x",
  "moondrop-space-travel-2",
  "jcally-jm12-portable-dac-amplifier",
]);

const knownBrands = [
  "7hz",
  "cca",
  "gk",
  "kiwi ears",
  "kz",
  "moondrop",
  "qkz",
  "simgot",
  "tangzu",
  "trn",
  "truthear",
];

function sql(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 96);
}

function titleCase(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function moneyMnt(yuan) {
  const parsed = Number.parseFloat(String(yuan ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * yuanToMnt);
}

function brandNameFor(result) {
  const haystack = `${result.query} ${result.matched_search_result?.title ?? ""}`.toLowerCase();
  const brand = knownBrands.find((candidate) => haystack.includes(candidate));

  if (brand) return titleCase(brand);

  return titleCase(result.query.split(/\s+/)[0] ?? "IEM");
}

function productNameFor(result) {
  return titleCase(result.query.replaceAll(/\s+/g, " ").trim());
}

const okResults = source.results.filter((result) => result.status === "ok");
const statements = [
  "-- Generated from iem-yangkeduo-prices-en.json. Yuan prices are converted with a temporary 1 CNY = 500 MNT rule.",
];
const brandByName = new Map();

for (const result of okResults) {
  const brandName = brandNameFor(result);
  const brandSlug = slugify(brandName);
  const brandId = `brand_${brandSlug}`;

  if (!brandByName.has(brandName)) {
    brandByName.set(brandName, brandId);
    statements.push(
      `INSERT INTO brand (id, slug, name, description, website_url, created_at, updated_at) VALUES (${sql(brandId)}, ${sql(brandSlug)}, ${sql(brandName)}, NULL, NULL, unixepoch(), unixepoch()) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, created_at = excluded.created_at, updated_at = excluded.updated_at;`,
    );
  }

  const productName = productNameFor(result);
  const productSlug = slugify(productName);
  const productId = `product_${productSlug}`;
  const basePriceMnt = moneyMnt(result.base_price_yuan);
  const featured = featuredSlugs.has(productSlug) ? 1 : 0;
  const description = [
    result.matched_search_result?.title,
    result.product_title,
    result.product_url ? `Source: ${result.product_url}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  statements.push(
    `INSERT INTO product (id, slug, brand_id, name, short_description, description, status, base_price_mnt, compare_at_price_mnt, currency, featured, created_at, updated_at) VALUES (${sql(productId)}, ${sql(productSlug)}, ${sql(brandId)}, ${sql(productName)}, ${sql(result.matched_search_result?.title ?? null)}, ${sql(description)}, 'active', ${basePriceMnt}, NULL, 'MNT', ${featured}, unixepoch(), unixepoch()) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, brand_id = excluded.brand_id, name = excluded.name, short_description = excluded.short_description, description = excluded.description, status = excluded.status, base_price_mnt = excluded.base_price_mnt, featured = excluded.featured, created_at = excluded.created_at, updated_at = excluded.updated_at;`,
  );

  statements.push(
    `INSERT INTO iem_spec (product_id, driver_type, driver_config, impedance_ohms, sensitivity_db, frequency_response, connector, cable, mic, shell_material, nozzle_material, sound_signature, fit, included_accessories) VALUES (${sql(productId)}, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT(product_id) DO NOTHING;`,
  );

  const variations = result.variations?.length
    ? result.variations
    : [{ selected: productName, price_yuan: result.base_price_yuan }];

  for (const [index, variation] of variations.entries()) {
    const variantName = variation.selected || productName;
    const variantSlug = slugify(`${productSlug}-${variantName || index}`);
    const variantId = `variant_${variantSlug}`.slice(0, 120);
    const sku = `PLG-${variantSlug}`.toUpperCase().slice(0, 80);
    const priceMnt = moneyMnt(variation.price_yuan || result.base_price_yuan);
    const compareAtPriceMnt = moneyMnt(variation.promo_price_before_coupon_yuan);

    statements.push(
      `INSERT INTO product_variant (id, product_id, sku, name, price_mnt, compare_at_price_mnt, stock_quantity, reserved_quantity, active, created_at, updated_at) VALUES (${sql(variantId)}, ${sql(productId)}, ${sql(sku)}, ${sql(variantName)}, ${priceMnt}, ${compareAtPriceMnt || "NULL"}, 10, 0, 1, unixepoch(), unixepoch()) ON CONFLICT(id) DO UPDATE SET sku = excluded.sku, name = excluded.name, price_mnt = excluded.price_mnt, compare_at_price_mnt = excluded.compare_at_price_mnt, active = excluded.active, created_at = excluded.created_at, updated_at = excluded.updated_at;`,
    );
  }
}

console.log(statements.join("\n"));
