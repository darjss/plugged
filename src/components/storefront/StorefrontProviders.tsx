import { QueryClientProvider } from "@tanstack/solid-query";
import type { ParentProps } from "solid-js";

import { queryClient } from "../../lib/query-client";

/**
 * Provides the shared `QueryClient` to storefront islands mounted via
 * `client:only="solid-js"`. Astro islands render outside any React/Solid
 * tree, so each island that uses `@tanstack/solid-query` hooks must wrap
 * itself in this provider — otherwise hydration throws
 * "No QueryClient set, use QueryClientProvider to set one".
 */
export default function StorefrontProviders(props: ParentProps) {
  return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>;
}
