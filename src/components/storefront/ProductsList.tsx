import { useInfiniteQuery, type InfiniteData } from "@tanstack/solid-query";
import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import ProductCard from "./ProductCard";
import type { StoreProduct } from "./product-types";

interface ProductsListProps {
  /** SSR-rendered first page — hydrated as the infinite query's initial data. */
  initialProducts: StoreProduct[];
  /** Category slug to pin the infinite query to (category landing pages). */
  categorySlug?: string;
  /** Brand slug to pin the infinite query to. */
  brandSlug?: string;
  /** Page size for each infinite-query fetch. */
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 12;

/**
 * Storefront product grid with client-side infinite scroll. Hydrates from
 * the SSR first page (no flash, no duplicate fetch) then appends pages via
 * `GET /products?offset=N` as the sentinel intersects the viewport.
 *
 * `client:only="solid-js"` — the island reads URL params on mount, so it
 * must run only in the browser to avoid SSR/localStorage mismatches.
 */
export default function ProductsList(props: ProductsListProps) {
  const pageSize = () => props.pageSize ?? DEFAULT_PAGE_SIZE;

  // Read live filter params from the URL so the grid reacts to filter-bar
  // navigation without a full page reload (View Transitions handle the
  // first paint; this keeps subsequent filter changes snappy).
  const urlParams = () => new URLSearchParams(window.location.search);
  const categorySlug = () => props.categorySlug ?? urlParams().get("category") ?? undefined;
  const brandSlug = () => props.brandSlug ?? urlParams().get("brand") ?? undefined;

  const query = useInfiniteQuery(() => ({
    queryKey: ["products", { categorySlug: categorySlug(), brandSlug: brandSlug() }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const params: Record<string, string> = {
        limit: String(pageSize()),
        offset: String(pageParam),
      };
      const cat = categorySlug();
      const brand = brandSlug();
      if (cat) params.category = cat;
      if (brand) params.brand = brand;

      const { data, error } = await api.products.get({ query: params });
      if (error) throw error;
      // Eden can't infer the success body for this route because the
      // Drizzle relational return type is too deep for Elysia's type
      // inference. The runtime shape is `{ products: StoreProduct[] }`.
      return (data as unknown as { products: StoreProduct[] }).products;
    },
    initialData: {
      pages: [props.initialProducts],
      pageParams: [0],
    } as InfiniteData<StoreProduct[], number>,
    getNextPageParam: (lastPage: StoreProduct[], allPages: StoreProduct[][]) =>
      lastPage.length < pageSize() ? undefined : allPages.length * pageSize(),
  }));

  const products = createMemo(() => query.data?.pages.flat() ?? []);
  const isEmpty = createMemo(
    () => !query.isPending && !query.isFetching && products().length === 0,
  );

  // Sentinel-driven infinite scroll via IntersectionObserver.
  const [sentinel, setSentinel] = createSignal<HTMLDivElement | null>(null);
  let observer: IntersectionObserver | null = null;

  onMount(() => {
    // Remove the SSR grid once the island mounts — the island re-renders
    // the same first page from initialData, so there is no visual flash,
    // and the SSR nodes no longer duplicate the reactive grid.
    document.getElementById("products-ssr")?.remove();

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    const el = sentinel();
    if (el) observer.observe(el);
  });

  onCleanup(() => observer?.disconnect());

  return (
    <div>
      <Show when={!isEmpty()} fallback={<EmptyState />}>
        <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          <For each={products()}>{(product) => <ProductCard product={product} />}</For>
        </div>

        {/* Sentinel + load-more affordance */}
        <Show when={query.hasNextPage}>
          <div ref={setSentinel} class="flex justify-center py-12" aria-hidden="true">
            <Show when={query.isFetchingNextPage} fallback={<div class="h-1 w-1" />}>
              <div
                class={cn(
                  "border-2 border-ink bg-card px-6 py-3 font-display text-sm font-black uppercase tracking-wide shadow-hard-sm",
                )}
              >
                Loading more…
              </div>
            </Show>
          </div>
        </Show>

        {/* End-of-list marker */}
        <Show when={!query.hasNextPage && products().length > 0}>
          <div class="flex flex-col items-center gap-2 py-12">
            <div class="h-px w-24 bg-ink/30" />
            <span class="text-micro font-black uppercase tracking-widest text-ink-muted">
              End of the wall
            </span>
          </div>
        </Show>
      </Show>
    </div>
  );
}

/**
 * Grunge empty state — torn-paper "no products found" flyer.
 */
function EmptyState() {
  return (
    <div class="flex flex-col items-center gap-6 py-20 text-center">
      <div
        class="relative -rotate-2 border-4 border-ink bg-newsprint-2 px-8 py-10 shadow-hard"
        style={{ "clip-path": "polygon(2% 0, 98% 3%, 100% 92%, 4% 100%)" }}
      >
        <p class="text-micro font-black uppercase tracking-widest text-orange">Empty wall</p>
        <h2 class="mt-2 font-display text-display font-black uppercase leading-none tracking-tight text-ink">
          Nothin' taped up
        </h2>
        <p class="mt-3 max-w-sm text-body text-ink-muted">
          No products match these filters yet. Try a different category or brand, or come back when
          the next drop lands.
        </p>
        <a
          href="/products"
          class="mt-5 inline-block border-2 border-ink bg-orange px-6 py-3 text-sm font-black uppercase tracking-wide text-ink shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          Clear filters
        </a>
      </div>
    </div>
  );
}
