import { env } from "cloudflare:workers";

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const MEMORY_CACHE = new Map<string, { expires: number; terms: string[] }>();
const MEMORY_CACHE_MAX = 200;
const TTL_SECONDS = 60 * 60 * 24;

// Bounded insert: FIFO-evict the oldest entry once the cache is full
// (Map preserves insertion order, so the first key is the oldest).
function rememberInMemory(query: string, terms: string[]) {
  if (!MEMORY_CACHE.has(query) && MEMORY_CACHE.size >= MEMORY_CACHE_MAX) {
    const oldest = MEMORY_CACHE.keys().next().value;
    if (oldest !== undefined) MEMORY_CACHE.delete(oldest);
  }
  MEMORY_CACHE.set(query, { expires: Date.now() + TTL_SECONDS * 1000, terms });
}

const IEM_SYNONYMS: Record<string, string[]> = {
  bass: ["bass-heavy", "low-frequency", "sub-bass", "warm"],
  bright: ["treble", "sparkle", "detail", "analytical"],
  cable: ["connector", "2-pin", "mmcx"],
  dac: ["amp", "dongle", "source", "usb-c"],
  gaming: ["imaging", "soundstage", "separation", "mic"],
  iem: ["in-ear monitor", "earphone", "earbud"],
  neutral: ["balanced", "reference", "studio"],
  planar: ["planar magnetic", "fast driver"],
  vocal: ["midrange", "mids", "voice"],
  wireless: ["bluetooth", "tws", "earbud"],
};

export async function expandSearchQuery(query: string): Promise<string[]> {
  const cleaned = normalize(query);
  if (!cleaned) return [];

  const cached = await getCached(cleaned);
  if (cached) return cached;

  const localTerms = expandLocally(cleaned);
  const aiTerms = await expandWithAi(cleaned).catch(() => []);
  const terms = unique([cleaned, ...localTerms, ...aiTerms]).slice(0, 12);

  await putCached(cleaned, terms);
  return terms;
}

function expandLocally(query: string) {
  const words = query.split(/\s+/).filter(Boolean);
  return words.flatMap((word) => IEM_SYNONYMS[word] ?? []);
}

async function expandWithAi(query: string): Promise<string[]> {
  const ai = (env as Env & { AI?: Ai }).AI;
  if (!ai) return [];

  const result = await ai.run(MODEL, {
    max_tokens: 80,
    prompt: `Return only comma-separated ecommerce search synonyms for IEM audio query: ${query}`,
  });
  const response = typeof result.response === "string" ? result.response : "";
  return response
    .split(/[,\n]/)
    .map(normalize)
    .filter((term) => term.length >= 2 && term.length <= 40);
}

async function getCached(query: string) {
  const memory = MEMORY_CACHE.get(query);
  if (memory && memory.expires > Date.now()) return memory.terms;

  const cache = (env as Env & { CACHE?: KVNamespace }).CACHE;
  const stored = await cache?.get(cacheKey(query), "json").catch(() => null);
  if (Array.isArray(stored) && stored.every((item) => typeof item === "string")) {
    rememberInMemory(query, stored);
    return stored;
  }
  return null;
}

async function putCached(query: string, terms: string[]) {
  rememberInMemory(query, terms);
  const cache = (env as Env & { CACHE?: KVNamespace }).CACHE;
  await cache
    ?.put(cacheKey(query), JSON.stringify(terms), { expirationTtl: TTL_SECONDS })
    .catch(() => {});
}

function cacheKey(query: string) {
  return `search:expand:${query}`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
