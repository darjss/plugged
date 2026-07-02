import Firecrawl from "@mendable/firecrawl-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectEnvPath = join(__dirname, "..", ".env");

function readKeyFromEnvFile(path) {
  if (!existsSync(path)) return undefined;
  const env = readFileSync(path, "utf8");
  return env
    .split(/\r?\n/)
    .find((l) => l.startsWith("FIRECRAWL_API_KEY="))
    ?.split("=")[1]
    ?.trim();
}

const key = process.env.FIRECRAWL_API_KEY ?? readKeyFromEnvFile(projectEnvPath);

if (!key) {
  throw new Error(
    `FIRECRAWL_API_KEY not found. Set it in the environment or in ${projectEnvPath}.`,
  );
}

const fc = new Firecrawl({ apiKey: key });

const CDN_BASE = "https://cdn.pluggedaudio.store";
const BUCKET = "plugged";

const products = [
  {
    slug: "kz-castor-pro",
    id: "product_kz-castor-pro",
    name: "KZ Castor PRO",
    amazonUrl: "https://www.amazon.com/Castor-Pro-Headphone-Dual-Dynamic-Detachable/dp/B0DLMVTSZ8",
  },
  {
    slug: "kz-zvx-pro",
    id: "product_kz-zvx-pro",
    name: "KZ ZVX PRO",
    amazonUrl: "https://www.amazon.com/ZVX-Pro-Dynamic-Ear-Headphones/dp/B0F632PD3C",
  },
  {
    slug: "kz-zsn-pro-2",
    id: "product_kz-zsn-pro-2",
    name: "KZ ZSN PRO 2",
    amazonUrl: "https://www.amazon.com/KZ-ZSN-Headphones-Technology-Cancellation/dp/B0CS6FPCFC",
  },
  {
    slug: "kz-prx",
    id: "product_kz-prx",
    name: "KZ PRX",
    amazonUrl: "https://www.amazon.com/PRX-Eabruds-Earphones-Audiophiles-Headphone/dp/B0DM1S9YSZ",
  },
];

const statements = ["-- KZ product image seeds (scraped from Amazon + uploaded to R2)"];

for (const product of products) {
  console.error(`\n=== ${product.name} ===`);
  console.error(`Scraping: ${product.amazonUrl}`);

  const imageUrls = await scrapeAmazonImages(product.amazonUrl);
  console.error(`Found ${imageUrls.length} image URLs`);

  // Filter to real product images (not tracking pixels)
  const goodUrls = [];
  const tmpDir = `/tmp/kz-img2/${product.slug}`;
  mkdirSync(tmpDir, { recursive: true });

  for (const [idx, url] of imageUrls.entries()) {
    if (goodUrls.length >= 4) break;
    const localPath = `${tmpDir}/${idx}.jpg`;
    try {
      execSync(`curl -sL -o "${localPath}" "${url}"`, { timeout: 15000 });
      const dims = execSync(
        `identify -format "%wx%h" "${localPath}" 2>/dev/null || file "${localPath}" | grep -oE '[0-9]+x[0-9]+' | head -1`,
      )
        .toString()
        .trim();
      const [w, h] = dims.split("x").map(Number);
      const size = Number(execSync(`stat -c%s "${localPath}"`).toString().trim());

      if (!w || !h || w < 200 || h < 200 || size < 10000) {
        console.error(`  Skip ${idx}: ${dims} ${size}bytes (too small)`);
        continue;
      }
      goodUrls.push({ url, localPath, dims, size });
      console.error(`  OK ${idx}: ${dims} ${size}bytes`);
    } catch (err) {
      console.error(`  Fail ${idx}: ${err.message}`);
    }
  }

  if (goodUrls.length === 0) {
    console.error(`No good images for ${product.name}`);
    continue;
  }

  // Upload to R2 (remote)
  for (const [idx, img] of goodUrls.entries()) {
    const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    const r2Key = `products/${product.id}/${hash}.jpg`;
    try {
      execSync(
        `wrangler r2 object put "${BUCKET}/${r2Key}" --file "${img.localPath}" --remote --content-type image/jpeg`,
        {
          timeout: 30000,
          stdio: "pipe",
        },
      );
      const cdnUrl = `${CDN_BASE}/${r2Key}`;
      const imageId = `image_${product.slug}_${idx + 1}`;
      const alt = `${product.name} product image`;
      statements.push(
        `INSERT INTO product_image (id, product_id, r2_key, url, alt, sort_order, is_primary, created_at) VALUES ('${imageId}', '${product.id}', '${r2Key}', '${cdnUrl}', '${alt}', ${idx}, ${idx === 0 ? 1 : 0}, unixepoch()) ON CONFLICT(id) DO UPDATE SET url = excluded.url, r2_key = excluded.r2_key, alt = excluded.alt, sort_order = excluded.sort_order, is_primary = excluded.is_primary;`,
      );
      console.error(`  Uploaded: ${cdnUrl} (${img.dims})`);
    } catch (err) {
      console.error(`  Upload fail: ${err.message}`);
    }
  }
}

writeFileSync("/tmp/kz-image-seed-v2.sql", statements.join("\n"));
console.log(statements.join("\n"));

async function scrapeAmazonImages(url) {
  try {
    const response = await fc.scrape(url, { formats: ["html"], onlyMainContent: false });
    const html = response.html ?? "";

    // Amazon stores hi-res images in data-old-hires attribute
    const hires = [];
    for (const match of html.matchAll(/data-old-hires="(https:\/\/[^"]+)"/g)) {
      hires.push(match[1].replaceAll("&amp;", "&"));
    }

    // Also look for imgTagWrapperId images
    const imgWrapper = [];
    for (const match of html.matchAll(/"hiRes":"(https:\/\/[^"]+)"/g)) {
      imgWrapper.push(match[1]);
    }
    for (const match of html.matchAll(/"large":"(https:\/\/[^"]+)"/g)) {
      imgWrapper.push(match[1]);
    }

    // Also landingAsColorImg
    for (const match of html.matchAll(
      /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\._AC_[^"]+)"/g,
    )) {
      const u = match[1];
      if (!u.includes("_AC_SS") && !u.includes("_AC_US")) {
        imgWrapper.push(u);
      }
    }

    // Dedupe and prefer hi-res
    const all = [...hires, ...imgWrapper];
    const unique = [...new Set(all)];

    // Filter to actual product images (not icons/banners)
    return unique.filter((u) => {
      const l = u.toLowerCase();
      if (l.includes("transparent") || l.includes("icon") || l.includes("logo")) return false;
      if (l.includes("nav") || l.includes("sprite")) return false;
      return true;
    });
  } catch (err) {
    console.error(`Scrape failed: ${url}`, err.message);
    return [];
  }
}
