export const RECENT_SEARCHES_KEY = "plugged:recent-searches";
export const RECENT_SEARCHES_MAX = 6;

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
