import { useInfiniteQuery, type InfiniteData } from "@tanstack/solid-query";
import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { api, unwrap } from "@/lib/eden";
import { cn } from "@/lib/utils";
import ProductCard from "./ProductCard";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import type { StoreProduct } from "@/types/product-types";
import StorefrontProviders from "./StorefrontProviders";

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

export default function ProductsList(props: ProductsListProps) {
  return (
    <StorefrontProviders>
      <ProductsListInner {...props} />
    </StorefrontProviders>
  );
}

function ProductsListInner(props: ProductsListProps) {
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

      const body = await unwrap<{ products: StoreProduct[] }>(api.products.get({ query: params }));
      return body.products;
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
      <Show
        when={query.isError}
        fallback={
          <Show when={!isEmpty()} fallback={<ProductsEmptyState />}>
            <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              <For each={products()}>{(product) => <ProductCard product={product} />}</For>
            </div>

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

            <Show when={!query.hasNextPage && products().length > 0}>
              <div class="flex flex-col items-center gap-2 py-12">
                <div class="h-px w-24 bg-ink/30" />
                <span class="text-micro font-black uppercase tracking-widest text-ink-muted">
                  End of the wall
                </span>
              </div>
            </Show>
          </Show>
        }
      >
        <ErrorState
          variant="flyer"
          kicker="Network failure"
          title="The wall fell over"
          message="Couldn't pull products from the warehouse. The connection dropped or the server's splicing tape. Try again."
          onRetry={() => void query.refetch()}
          isFetching={query.isFetching}
          retryLabel="↻ Retry"
          retryingLabel="Pulling…"
        />
      </Show>
    </div>
  );
}

function ProductsEmptyState() {
  const suggestions = [
    { label: "IEMs", href: "/products?category=iems" },
    { label: "DAC amps", href: "/products?category=dac-amps" },
    { label: "Wireless", href: "/products?category=wireless" },
  ];

  return (
    <EmptyState
      variant="flyer"
      title="No products found"
      message="Nothin' taped up under these filters. Try a different category or brand, or come back when the next drop lands."
    >
      <div class="mt-5 flex flex-col gap-3">
        <p class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
          Try the popular walls
        </p>
        <div class="flex flex-wrap justify-center gap-2">
          <For each={suggestions}>
            {(s) => (
              <a
                href={s.href}
                class="rotate-1 border-2 border-ink bg-yellow px-4 py-2 font-mono text-caption font-black uppercase tracking-wide text-ink shadow-hard-sm transition-all hover:-rotate-1 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              >
                {s.label}
              </a>
            )}
          </For>
        </div>
      </div>
      <a
        href="/products"
        class="mt-5 inline-block border-2 border-ink bg-orange px-6 py-3 text-sm font-black uppercase tracking-wide text-ink shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
      >
        Clear filters
      </a>
    </EmptyState>
  );
}
