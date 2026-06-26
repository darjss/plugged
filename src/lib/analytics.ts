export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const CART_TOKEN_KEY = "plugged-cart-token";

function analyticsStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getCartToken(): string | undefined {
  const storage = analyticsStorage();
  if (!storage) return undefined;

  const existing = storage.getItem(CART_TOKEN_KEY);
  if (existing) return existing;

  const token = crypto.randomUUID ? crypto.randomUUID() : `cart_${Date.now()}_${Math.random()}`;
  storage.setItem(CART_TOKEN_KEY, token);
  return token;
}

export function cartAnalyticsProperties(): AnalyticsProperties {
  return { cart_token: getCartToken() };
}

export function trackAnalytics(event: string, properties: AnalyticsProperties = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("plugged:analytics", { detail: { event, properties } }));
}

export function trackSearchPerformed(query: string, resultCount: number) {
  trackAnalytics("search_performed", { query, result_count: resultCount });
}

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: AnalyticsProperties) => void;
      opt_in_capturing?: () => void;
      opt_out_capturing?: () => void;
      has_opted_out_capturing?: () => boolean;
      isFeatureEnabled?: (key: string) => boolean | undefined;
    };
  }
}
