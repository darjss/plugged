/**
 * Recent-search localStorage helper. The key and parsing are shared
 * so the search overlay and any future caller stay in sync.
 */
export const RECENT_SEARCHES_KEY = "plugged:recent-searches";
export const RECENT_SEARCHES_MAX = 6;

/** Read and sanitize the recent-searches list from localStorage. */
export function readRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string").slice(0, RECENT_SEARCHES_MAX)
      : [];
  } catch {
    return [];
  }
}
