import { env } from "cloudflare:workers";

/**
 * squig.link frequency response fetcher.
 *
 * squig.link exposes per-IEM measurement files as plain text under
 * `/data/<file> L.txt` / `<file> R.txt` (note the literal space between
 * the file name and the channel suffix). Rows are `frequency\tdB`.
 *
 * Parsed results are cached in the `CACHE` KV namespace for 24h. Fetch
 * failures (network, 404, parse) return `null` and are NOT cached, so a
 * transient outage retries on the next request.
 */

const BASE_URL = "https://squig.link";
const TTL_SECONDS = 60 * 60 * 24;

export interface FrequencyPoint {
  freq: number;
  db: number;
}

export interface FrequencyResponse {
  left: FrequencyPoint[];
  right: FrequencyPoint[];
}

function parseChannel(text: string): FrequencyPoint[] {
  const points: FrequencyPoint[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    // Skip header lines (non-numeric first token).
    const parts = trimmed.split(/[\s,]+/);
    if (parts.length < 2) continue;
    const freq = Number(parts[0]);
    const db = Number(parts[1]);
    if (!Number.isFinite(freq) || !Number.isFinite(db)) continue;
    points.push({ freq, db });
  }
  points.sort((a, b) => a.freq - b.freq);
  return points;
}

async function fetchChannel(file: string, suffix: string): Promise<FrequencyPoint[]> {
  // The squig.link convention is `<file> L.txt` with a literal space.
  // Encode the space as %20; the file name itself may contain spaces.
  const url = `${BASE_URL}/data/${encodeURIComponent(file)}%20${suffix}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`squig.link ${suffix} fetch failed: ${res.status}`);
  const text = await res.text();
  return parseChannel(text);
}

export async function getFrequencyResponse(
  squiglinkFile: string,
): Promise<FrequencyResponse | null> {
  const cache = env.CACHE;
  const cacheKey = `squig:fr:${squiglinkFile}`;

  if (cache) {
    const cached = await cache.get<FrequencyResponse>(cacheKey, "json");
    if (cached) return cached;
  }

  try {
    const [left, right] = await Promise.all([
      fetchChannel(squiglinkFile, "L.txt"),
      fetchChannel(squiglinkFile, "R.txt"),
    ]);
    if (left.length === 0 || right.length === 0) return null;

    const result: FrequencyResponse = { left, right };
    if (cache) {
      await cache.put(cacheKey, JSON.stringify(result), { expirationTtl: TTL_SECONDS });
    }
    return result;
  } catch (error) {
    console.error("[squiglink] frequency response fetch failed", {
      file: squiglinkFile,
      error: String(error),
    });
    return null;
  }
}
