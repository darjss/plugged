import { For, Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { Search, X } from "lucide-solid";

import { cn } from "@/lib/utils";
import ProductCard from "./ProductCard";
import type { StoreProduct } from "./product-types";

const RECENT_KEY = "plugged:recent-searches";

export default function SearchOverlay() {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<StoreProduct[]>([]);
  const [recent, setRecent] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [searched, setSearched] = createSignal(false);
  const [inputRef, setInputRef] = createSignal<HTMLInputElement | null>(null);
  let controller: AbortController | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const close = () => setOpen(false);
  const startSearch = (value = query()) => {
    const q = value.trim();
    setQuery(q);
    if (!q) return;
    setRecent((items) => [q, ...items.filter((item) => item !== q)].slice(0, 6));
    void runSearch(q);
  };

  onMount(() => {
    setRecent(readRecent());

    const openHandler = () => setOpen(true);
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("plugged:open-search", openHandler);
    window.addEventListener("keydown", keyHandler);
    onCleanup(() => {
      window.removeEventListener("plugged:open-search", openHandler);
      window.removeEventListener("keydown", keyHandler);
    });
  });

  createEffect(() => {
    document.body.style.overflow = open() ? "hidden" : "";
    if (open()) queueMicrotask(() => inputRef()?.focus());
  });

  createEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent()));
  });

  createEffect(() => {
    const q = query().trim();
    clearTimeout(debounce);
    controller?.abort();
    if (!open() || q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    debounce = setTimeout(() => void runSearch(q, false), 300);
  });

  onCleanup(() => {
    clearTimeout(debounce);
    controller?.abort();
    document.body.style.overflow = "";
  });

  async function runSearch(q: string, remember = true) {
    controller?.abort();
    controller = new AbortController();
    setLoading(true);
    setSearched(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Search failed");
      const data = (await response.json()) as { products: StoreProduct[] };
      setResults(data.products);
      if (remember) setRecent((items) => [q, ...items.filter((item) => item !== q)].slice(0, 6));
    } catch (error) {
      if ((error as Error).name !== "AbortError") setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Show when={open()}>
      <div class="fixed inset-0 z-[80] overflow-y-auto bg-newsprint bg-noise text-ink">
        <div class="sticky top-0 z-10 border-b-4 border-ink bg-hazard-stripes p-4">
          <div class="mx-auto flex max-w-screen-2xl items-center gap-3">
            <div class="flex size-11 shrink-0 rotate-[-2deg] items-center justify-center border-2 border-ink bg-orange shadow-hard-sm">
              <Search class="size-5" />
            </div>
            <form
              class="flex flex-1 items-center"
              onSubmit={(event) => {
                event.preventDefault();
                startSearch();
              }}
            >
              <input
                ref={setInputRef}
                value={query()}
                onInput={(event) => setQuery(event.currentTarget.value)}
                placeholder="bass iem, planar, gaming, bright..."
                class="w-full border-4 border-ink bg-newsprint px-4 py-3 font-mono text-lg font-black uppercase tracking-tight shadow-hard outline-none placeholder:text-ink-muted focus:bg-yellow md:text-3xl"
              />
            </form>
            <button
              type="button"
              onClick={close}
              aria-label="Close search"
              class="flex size-11 shrink-0 items-center justify-center border-2 border-ink bg-card shadow-hard-sm transition-all hover:bg-pink hover:text-newsprint"
            >
              <X class="size-5" />
            </button>
          </div>
        </div>

        <div class="mx-auto grid max-w-screen-2xl gap-8 px-4 py-8 lg:grid-cols-[260px_1fr] lg:px-8">
          <aside class="space-y-4">
            <div class="-rotate-1 border-2 border-ink bg-newsprint-2 p-4 shadow-hard-sm">
              <p class="text-micro font-black uppercase tracking-widest text-orange">
                Recent searches
              </p>
              <Show
                when={recent().length > 0}
                fallback={<p class="mt-3 text-sm font-bold text-ink-muted">No old noise yet.</p>}
              >
                <div class="mt-3 flex flex-wrap gap-2 lg:flex-col">
                  <For each={recent()}>
                    {(item) => (
                      <button
                        type="button"
                        onClick={() => startSearch(item)}
                        class="border-2 border-ink bg-card px-3 py-2 text-left text-micro font-black uppercase tracking-wide shadow-hard-sm transition-all hover:bg-cyan"
                      >
                        {item}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
            <a
              href={query().trim() ? `/search?q=${encodeURIComponent(query().trim())}` : "/search"}
              class="inline-block rotate-1 border-2 border-ink bg-orange px-4 py-3 text-caption font-black uppercase tracking-wide shadow-hard-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Open full search
            </a>
          </aside>

          <section>
            <div class="mb-6 flex items-end justify-between gap-4 border-b-4 border-ink pb-4">
              <div>
                <p class="text-micro font-black uppercase tracking-widest text-orange">AI search</p>
                <h2 class="font-display text-display font-black uppercase leading-none tracking-tight">
                  Find your sound
                </h2>
              </div>
              <Show when={loading()}>
                <span class="rotate-[-2deg] border-2 border-ink bg-yellow px-3 py-2 text-micro font-black uppercase shadow-hard-sm">
                  scanning
                </span>
              </Show>
            </div>

            <Show
              when={results().length > 0}
              fallback={<EmptySearch searched={searched()} query={query()} />}
            >
              <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                <For each={results()}>{(product) => <ProductCard product={product} />}</For>
              </div>
            </Show>
          </section>
        </div>
      </div>
    </Show>
  );
}

function EmptySearch(props: { searched: boolean; query: string }) {
  return (
    <div
      class={cn(
        "border-4 border-ink bg-card px-6 py-10 shadow-hard",
        props.searched ? "rotate-[-1deg]" : "rotate-1",
      )}
    >
      <p class="text-micro font-black uppercase tracking-widest text-orange">
        {props.searched ? "No matches" : "Type to search"}
      </p>
      <p class="mt-2 max-w-prose text-body-lg font-bold text-ink-muted">
        {props.searched
          ? `Nothing on the wall for “${props.query}”. Try sound signature, brand, driver, or fit.`
          : "Search by sound, brand, driver, category, or weird headphone forum language."}
      </p>
    </div>
  );
}

function readRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string").slice(0, 6)
      : [];
  } catch {
    return [];
  }
}
