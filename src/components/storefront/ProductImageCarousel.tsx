import { ChevronLeft, ChevronRight } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";

import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types/product-types";

interface Props {
  images: ProductImage[];
  productName: string;
}

export default function ProductImageCarousel(props: Props) {
  const images = () => {
    const sorted = [...props.images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    return sorted.length > 0 ? sorted : [];
  };

  const [selected, setSelected] = createSignal(0);

  const go = (delta: number) => {
    const list = images();
    if (list.length === 0) return;
    setSelected((prev) => (prev + delta + list.length) % list.length);
  };

  // Swipe detection — horizontal only, vertical scrolls the page.
  const SWIPE_THRESHOLD = 50;
  let pointerStart: { x: number; y: number } | null = null;

  const onPointerDown = (e: PointerEvent) => {
    pointerStart = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = pointerStart;
    pointerStart = null;
    if (!start || images().length <= 1) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
    go(dx < 0 ? 1 : -1);
  };

  return (
    <div class="w-full space-y-4">
      {/* Primary image — torn-edge frame with halftone backdrop */}
      <div
        class="clip-torn-edges relative aspect-square w-full overflow-hidden border-2 border-ink bg-newsprint-dark shadow-hard-lg"
        style={{ "touch-action": "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* Halftone backdrop */}
        <div class="absolute inset-0 bg-halftone-lg opacity-20" aria-hidden="true" />

        <Show
          when={images()[selected()]}
          fallback={
            <div class="relative z-10 flex h-full w-full items-center justify-center p-8">
              <span class="font-display text-heading-lg font-black uppercase text-ink-muted">
                No image
              </span>
            </div>
          }
        >
          <img
            src={images()[selected()]?.url}
            alt={images()[selected()]?.alt ?? props.productName}
            class="relative z-10 h-full w-full object-cover p-6 transition-transform duration-500 hover:scale-105"
            style={{ filter: "grayscale(0.15) contrast(1.12)" }}
            loading="eager"
            fetchpriority="high"
          />
        </Show>

        {/* Arrow nav — only when multiple images */}
        <Show when={images().length > 1}>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            class="absolute left-2 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center border-2 border-ink bg-newsprint shadow-hard-sm transition-all hover:bg-orange hover:translate-x-[-1px] active:shadow-none"
          >
            <ChevronLeft class="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            class="absolute right-2 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center border-2 border-ink bg-newsprint shadow-hard-sm transition-all hover:bg-orange hover:translate-x-[1px] active:shadow-none"
          >
            <ChevronRight class="size-5" />
          </button>
        </Show>

        {/* Counter stamp */}
        <Show when={images().length > 1}>
          <span class="absolute bottom-3 right-3 z-20 rotate-2 border-2 border-ink bg-ink px-2 py-0.5 font-mono text-micro font-black uppercase text-newsprint shadow-hard-sm">
            {selected() + 1}/{images().length}
          </span>
        </Show>
      </div>

      {/* Thumbnails */}
      <Show when={images().length > 1}>
        <div class="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
          <For each={images()}>
            {(image, index) => (
              <button
                type="button"
                onClick={() => setSelected(index())}
                aria-label={`View image ${index() + 1}`}
                aria-pressed={selected() === index()}
                class={cn(
                  "clip-torn-edges relative size-16 shrink-0 overflow-hidden border-2 border-ink transition-all sm:size-20",
                  selected() === index()
                    ? "scale-105 bg-orange shadow-hard"
                    : "opacity-60 shadow-hard-sm hover:scale-105 hover:opacity-100",
                )}
              >
                <div class="absolute inset-0 bg-halftone opacity-15" aria-hidden="true" />
                <img
                  src={image.url}
                  alt={image.alt ?? `${props.productName} ${index() + 1}`}
                  class="relative z-10 h-full w-full object-cover p-1.5"
                  style={{ filter: "grayscale(0.4) contrast(1.1)" }}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
