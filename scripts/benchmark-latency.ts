/**
 * Benchmark production API latency for Plugged (D1) and/or vit-store
 * (Planetscale + Hyperdrive), side by side.
 *
 * Run:
 *   bun run scripts/benchmark-latency.ts                  # both (default)
 *   bun run scripts/benchmark-latency.ts --target plugged
 *   bun run scripts/benchmark-latency.ts --target vit-store
 *   bun run scripts/benchmark-latency.ts --target both
 *   bun run scripts/benchmark-latency.ts --iterations 20
 *
 * Only public/storefront endpoints — no auth needed.
 *
 * Results: printed to stdout, written to /tmp/benchmark-results.json.
 */

const DEFAULT_ITERATIONS = 10;
const RESULTS_PATH = "/tmp/benchmark-results.json";

// --- CLI parsing --------------------------------------------------------
const args = process.argv.slice(2);
let target: "plugged" | "vit-store" | "both" = "both";
let iterations = DEFAULT_ITERATIONS;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--target" && args[i + 1]) {
    target = args[i + 1] as "plugged" | "vit-store" | "both";
    i++;
  } else if (args[i] === "--iterations" && args[i + 1]) {
    iterations = Number(args[i + 1]);
    i++;
  } else if (args[i]?.startsWith("--target=")) {
    target = args[i]!.slice("--target=".length) as "plugged" | "vit-store" | "both";
  } else if (args[i]?.startsWith("--iterations=")) {
    iterations = Number(args[i]!.slice("--iterations=".length));
  }
}
if (!["plugged", "vit-store", "both"].includes(target)) {
  console.error(`Invalid --target: ${target}. Use plugged | vit-store | both`);
  process.exit(1);
}

// --- Endpoint model -----------------------------------------------------
type Endpoint = {
  /** category used for side-by-side comparison */
  category: string;
  name: string;
  /** full URL */
  url: string;
  method: "GET" | "POST";
  /** tRPC GET requests pass input as ?input=<json>; raw query already in url */
  body?: unknown;
};

// --- Plugged (REST on Cloudflare D1) -----------------------------------
const PLUGGED_BASE = "https://pluggedaudio.store/api";
const PLUGGED_SLUGS = [
  "moondrop-chu-2",
  "truthear",
  "tangzu-waner-2-red-lion",
];
const pluggedEndpoints: Endpoint[] = [
  { category: "health", name: "plugged/health", url: `${PLUGGED_BASE}/health`, method: "GET" },
  { category: "product-list", name: "plugged/products?limit=20", url: `${PLUGGED_BASE}/products?limit=20`, method: "GET" },
  { category: "product-list", name: "plugged/products?limit=20&offset=0", url: `${PLUGGED_BASE}/products?limit=20&offset=0`, method: "GET" },
  ...PLUGGED_SLUGS.map<Endpoint>((slug) => ({
    category: "product-detail",
    name: `plugged/products/${slug}`,
    url: `${PLUGGED_BASE}/products/${slug}`,
    method: "GET",
  })),
  { category: "categories", name: "plugged/categories", url: `${PLUGGED_BASE}/categories`, method: "GET" },
  { category: "brands", name: "plugged/brands", url: `${PLUGGED_BASE}/brands`, method: "GET" },
  { category: "search", name: "plugged/search?q=moondrop", url: `${PLUGGED_BASE}/search?q=moondrop`, method: "GET" },
];

// --- vit-store (tRPC on Planetscale + Hyperdrive) ----------------------
const VIT_BASE = "https://api.amerikvitamin.mn";
const VIT_TRPC = `${VIT_BASE}/trpc/store`;
const trpcGet = (procedure: string, input?: unknown): string => {
  const q = input ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : "";
  return `${VIT_TRPC}/${procedure}${q}`;
};
const VIT_PRODUCT_IDS = [6993, 6994, 6995];
const vitEndpoints: Endpoint[] = [
  { category: "health", name: "vit-store/health-check", url: `${VIT_BASE}/health-check`, method: "GET" },
  { category: "product-list", name: "vit-store/product.getProductsForHome", url: trpcGet("product.getProductsForHome"), method: "GET" },
  { category: "product-list", name: "vit-store/product.getPaginatedProducts", url: trpcGet("product.getPaginatedProducts", { page: 1, pageSize: 20 }), method: "GET" },
  ...VIT_PRODUCT_IDS.map<Endpoint>((id) => ({
    category: "product-detail",
    name: `vit-store/product.getProductById(${id})`,
    url: trpcGet("product.getProductById", { id }),
    method: "GET",
  })),
  { category: "categories", name: "vit-store/category.getAllCategories", url: trpcGet("category.getAllCategories"), method: "GET" },
  { category: "brands", name: "vit-store/brand.getAllBrands", url: trpcGet("brand.getAllBrands"), method: "GET" },
  { category: "search", name: "vit-store/product.searchProducts", url: trpcGet("product.searchProducts", { query: "vitamin", limit: 10 }), method: "GET" },
];

// --- Benchmark core -----------------------------------------------------
type Sample = {
  target: string;
  category: string;
  name: string;
  url: string;
  method: string;
  iterations: number;
  status: number;
  timesMs: number[];
  min: number;
  avg: number;
  p50: number;
  p95: number;
  max: number;
  error?: string;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx]!;
}

async function bench(targetName: string, ep: Endpoint): Promise<Sample> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "plugged-benchmark/1.0 (bun)",
  };
  if (ep.body) headers["Content-Type"] = "application/json";

  const times: number[] = [];
  let lastStatus = 0;
  let lastError: string | undefined;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      await res.text();
      lastStatus = res.status;
      if (res.ok) times.push(performance.now() - start);
      else lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    target: targetName,
    category: ep.category,
    name: ep.name,
    url: ep.url,
    method: ep.method,
    iterations: times.length,
    status: lastStatus,
    timesMs: times,
    min: sorted[0] ?? 0,
    avg: times.length ? sum / times.length : 0,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
    error: lastError,
  };
}

function fmt(n: number): string {
  return n.toFixed(0).padStart(6, " ");
}

function printPerTarget(label: string, samples: Sample[]): void {
  console.log(`\n## ${label}`);
  const header =
    "endpoint".padEnd(46) +
    "iters".padStart(6) +
    "status".padStart(7) +
    "min".padStart(7) +
    "avg".padStart(7) +
    "p50".padStart(7) +
    "p95".padStart(7) +
    "max".padStart(7);
  console.log(header);
  console.log("-".repeat(header.length));
  for (const s of samples) {
    console.log(
      s.name.padEnd(46) +
        String(s.iterations).padStart(6) +
        String(s.status).padStart(7) +
        fmt(s.min) +
        fmt(s.avg) +
        fmt(s.p50) +
        fmt(s.p95) +
        fmt(s.max),
    );
    if (s.error && s.iterations === 0) console.log(`  ↳ ${s.error}`);
  }
}

/** Aggregate samples in a category by target (avg of avg, max of p95). */
function aggByCategory(samples: Sample[]): Map<string, { target: string; avg: number; p95: number; n: number }> {
  const byCat = new Map<string, Sample[]>();
  for (const s of samples) {
    if (s.iterations === 0) continue;
    const arr = byCat.get(s.category) ?? [];
    arr.push(s);
    byCat.set(s.category, arr);
  }
  const out = new Map<string, { target: string; avg: number; p95: number; n: number }>();
  for (const [cat, arr] of byCat) {
    const avg = arr.reduce((a, s) => a + s.avg, 0) / arr.length;
    const p95 = Math.max(...arr.map((s) => s.p95));
    out.set(`${arr[0]!.target}|${cat}`, { target: arr[0]!.target, avg, p95, n: arr.length });
  }
  return out;
}

function printComparison(plugged: Sample[], vit: Sample[]): void {
  console.log("\n## Side-by-side comparison (category aggregates)");
  const pAgg = aggByCategory(plugged);
  const vAgg = aggByCategory(vit);
  const cats = new Set<string>();
  for (const k of pAgg.keys()) cats.add(k.split("|")[1]!);
  for (const k of vAgg.keys()) cats.add(k.split("|")[1]!);

  const header =
    "category".padEnd(18) +
    "plugged avg".padStart(12) +
    "plugged p95".padStart(12) +
    "vit avg".padStart(10) +
    "vit p95".padStart(10) +
    "avg diff".padStart(10) +
    "winner".padStart(9);
  console.log(header);
  console.log("-".repeat(header.length));
  for (const cat of [...cats].sort()) {
    const p = pAgg.get(`plugged|${cat}`);
    const v = vAgg.get(`vit-store|${cat}`);
    const pAvg = p ? p.avg.toFixed(0) : "—";
    const pP95 = p ? p.p95.toFixed(0) : "—";
    const vAvg = v ? v.avg.toFixed(0) : "—";
    const vP95 = v ? v.p95.toFixed(0) : "—";
    let diff = "—";
    let winner = "—";
    if (p && v) {
      const d = v.avg - p.avg;
      diff = (d >= 0 ? "+" : "") + d.toFixed(0);
      winner = d < 0 ? "vit" : d > 0 ? "plugged" : "tie";
    }
    console.log(
      cat.padEnd(18) +
        String(pAvg).padStart(12) +
        String(pP95).padStart(12) +
        String(vAvg).padStart(10) +
        String(vP95).padStart(10) +
        String(diff).padStart(10) +
        winner.padStart(9),
    );
  }
  console.log("\n(avg diff = vit avg − plugged avg; winner = lower avg)");
}

async function main(): Promise<void> {
  console.log(`# API latency benchmark — Plugged (D1) vs vit-store (Planetscale+Hyperdrive)`);
  console.log(`# target: ${target}`);
  console.log(`# iterations per endpoint: ${iterations}`);
  console.log(`# started: ${new Date().toISOString()}`);

  const all: Sample[] = [];
  const plugged: Sample[] = [];
  const vit: Sample[] = [];

  if (target === "plugged" || target === "both") {
    console.log("\n[plugged] https://pluggedaudio.store/api");
    for (const ep of pluggedEndpoints) {
      process.stdout.write(`  → ${ep.name} ... `);
      const s = await bench("plugged", ep);
      plugged.push(s);
      all.push(s);
      console.log(`${s.status} avg=${fmt(s.avg).trim()}ms p95=${fmt(s.p95).trim()}ms${s.error && s.iterations === 0 ? ` ERR ${s.error}` : ""}`);
    }
  }
  if (target === "vit-store" || target === "both") {
    console.log("\n[vit-store] https://api.amerikvitamin.mn");
    for (const ep of vitEndpoints) {
      process.stdout.write(`  → ${ep.name} ... `);
      const s = await bench("vit-store", ep);
      vit.push(s);
      all.push(s);
      console.log(`${s.status} avg=${fmt(s.avg).trim()}ms p95=${fmt(s.p95).trim()}ms${s.error && s.iterations === 0 ? ` ERR ${s.error}` : ""}`);
    }
  }

  if (target === "plugged" || target === "both") printPerTarget("Plugged (D1)", plugged);
  if (target === "vit-store" || target === "both") printPerTarget("vit-store (Planetscale+Hyperdrive)", vit);
  if (target === "both") printComparison(plugged, vit);

  const payload = {
    target,
    iterations,
    startedAt: new Date().toISOString(),
    pluggedBaseUrl: PLUGGED_BASE,
    vitBaseUrl: VIT_BASE,
    samples: all,
  };
  await Bun.write(RESULTS_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`\n# results written to ${RESULTS_PATH}`);
}

main().catch((err) => {
  console.error("benchmark failed:", err);
  process.exit(1);
});
