import { env } from "../lib/env";

type PostHogProperties = Record<string, string | number | boolean | null | undefined>;

/** Server-side capture key (POSTHOG_KEY). Used for server events. */
function captureKey() {
  const k = env.POSTHOG_KEY;
  return k && k !== "phc_XXX" ? k : null;
}

/** Personal API key for admin analytics queries. Never falls back to
 *  the public browser key — that's a capture-only key, not a query token. */
function personalApiKey() {
  const k = env.POSTHOG_PERSONAL_API_KEY;
  return k && k !== "" ? k : null;
}

function host() {
  return env.POSTHOG_HOST ?? env.PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com";
}

export function posthogConfigured() {
  return Boolean(captureKey());
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: PostHogProperties = {},
) {
  const apiKey = captureKey();
  if (!apiKey) return;

  await fetch(`${host().replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      distinct_id: distinctId,
      event,
      properties,
    }),
  }).catch((error) => {
    console.error("posthog capture failed", { event, error: String(error) });
  });
}

export type AnalyticsPoint = { date: string; value: number };
export type FunnelStep = { event: string; count: number };

async function posthogQuery<T>(query: string): Promise<T | null> {
  const projectId = env.POSTHOG_PROJECT_ID;
  const apiKey = personalApiKey();
  if (!projectId || !apiKey) return null;

  const res = await fetch(`${host().replace(/\/$/, "")}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!res.ok) throw new Error(`PostHog query failed: ${res.status}`);
  return (await res.json()) as T;
}

function rows(payload: unknown): unknown[][] {
  if (!payload || typeof payload !== "object" || !("results" in payload)) return [];
  const results = (payload as { results?: unknown }).results;
  return Array.isArray(results) ? (results as unknown[][]) : [];
}

export async function getAnalyticsOverview() {
  const traffic = await posthogQuery(
    `SELECT toDate(timestamp) AS date, count() AS value FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY date ORDER BY date`,
  );
  const funnel = await posthogQuery(
    `SELECT event, count() AS value FROM events WHERE event IN ('$pageview', 'product_viewed', 'cart_add', 'checkout_started', 'order_completed') AND timestamp >= now() - INTERVAL 30 DAY GROUP BY event`,
  );
  const revenue = await posthogQuery(
    `SELECT toDate(timestamp) AS date, sum(toFloat(properties.total)) AS value FROM events WHERE event = 'order_completed' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY date ORDER BY date`,
  );

  const counts = new Map(rows(funnel).map((row) => [String(row[0]), Number(row[1] ?? 0)]));

  return {
    configured: Boolean(env.POSTHOG_PROJECT_ID && posthogConfigured()),
    traffic: rows(traffic).map((row) => ({ date: String(row[0]), value: Number(row[1] ?? 0) })),
    funnel: ["$pageview", "product_viewed", "cart_add", "checkout_started", "order_completed"].map(
      (event) => ({ event, count: counts.get(event) ?? 0 }),
    ),
    revenue: rows(revenue).map((row) => ({ date: String(row[0]), value: Number(row[1] ?? 0) })),
  };
}
