import { Show, createSignal } from "solid-js";
import { toast } from "solid-sonner";

import { cart } from "@/store/cart";
import { cn, formatMnt } from "@/lib/utils";
import { scrollReveal } from "@/lib/scroll-reveal";
import { firstVariant, primaryImage, type StoreProduct } from "@/types/product-types";

interface ProductCardProps {
  product: StoreProduct;
}

/**
 * Grunge product tile. Torn-paper card, halftone image (grayscale by
 * default, floods with color on hover), stamp price tag, and a quick
 * add-to-cart button that writes to the shared client cart store.
 *
 * Used both as a SolidJS island (infinite-scroll grid) and as the client
 * shape for cards SSR-rendered by the Astro page wrapper.
 */
export default function ProductCard(props: ProductCardProps) {
  const product = () => props.product;
  const image = () => primaryImage(product());
  const variant = () => firstVariant(product());
  const href = () => `/products/${product().slug}`;
  const price = () => variant()?.priceMnt ?? product().basePriceMnt;
  const compareAt = () => variant()?.compareAtPriceMnt ?? product().compareAtPriceMnt;
  const onSale = () => compareAt() !== null && compareAt()! > price();
  const soldOut = () => {
    const v = variant();
    return v ? v.stockQuantity - v.reservedQuantity <= 0 : true;
  };

  // Stamp-press animation flag — flipped true on click, reset after the
  // keyframe completes so the button can be pressed again.
  const [pressing, setPressing] = createSignal(false);

  const handleAddToCart = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const v = variant();
    if (!v || soldOut()) return;
    cart.add({
      variantId: v.id,
      productId: product().id,
      name: product().name,
      price: v.priceMnt,
      image: image(),
      slug: product().slug,
      quantity: 1,
    });
    // Stamp-press keyframe (CSS) — motion-one not needed for a one-shot
    // transform; the keyframe in global.css handles it. Reset after 400ms.
    setPressing(true);
    window.setTimeout(() => setPressing(false), 400);
    // Toast slides in (solid-sonner handles the slide animation; the
    // grunge toast styling comes from sonner.tsx theme overrides).
    toast.success(`Stamped: ${product().name}`, {
      description: "Added to your stash.",
    });
  };

  return (
    <article
      ref={(el) => scrollReveal(el)}
      class={cn(
        "group relative flex flex-col border-2 border-ink bg-card shadow-hard-sm",
        "transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-hard",
        "hover:[--rotate:0deg]",
      )}
      style={{ transform: `rotate(${hashRotation(product().id)}deg)` }}
      data-product-id={product().id}
    >
      {/* Image — halftone B&W by default, color on hover.
          `view-transition-name` enables the View Transition morph into
          the product detail hero image. The naming convention is:
            product-image-{slug}  — image element
            product-title-{slug}  — title element
          The product detail page MUST use the SAME names with the SAME
          slug (not id) for the morph to work. Set via inline style
          because SolidJS islands don't get Astro's `transition:name`
          directive (that's .astro-only). */}
      <a
        href={href()}
        class="relative block aspect-square overflow-hidden border-b-2 border-ink bg-newsprint-dark"
        aria-hidden="true"
        tabindex="-1"
        style={{ "view-transition-name": `product-image-${product().slug}` }}
      >
        <div
          class="absolute inset-0 bg-halftone opacity-30 group-hover-halftone"
          aria-hidden="true"
        />
        <Show
          when={image()}
          fallback={
            <div class="flex h-full w-full items-center justify-center bg-halftone">
              <span class="font-display text-4xl font-black uppercase text-ink-muted/40">
                {product().name.slice(0, 2)}
              </span>
            </div>
          }
        >
          <img
            src={image()}
            alt={product().name}
            loading="lazy"
            decoding="async"
            class="absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
            style={{
              filter: "grayscale(1) contrast(1.15)",
              "transition-property": "filter, transform",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "grayscale(0) contrast(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "grayscale(1) contrast(1.15)")}
          />
        </Show>

        {/* Featured stamp */}
        <Show when={product().featured}>
          <span class="absolute left-2 top-2 -rotate-3 border-2 border-ink bg-yellow px-2 py-0.5 text-micro font-black uppercase tracking-wide shadow-hard-sm">
            Featured
          </span>
        </Show>

        {/* Sold-out stamp */}
        <Show when={soldOut()}>
          <span class="absolute inset-0 flex items-center justify-center">
            <span class="rotate-[-8deg] border-4 border-ink bg-pink px-4 py-1.5 font-display text-2xl font-black uppercase text-newsprint shadow-hard">
              Sold out
            </span>
          </span>
        </Show>
      </a>

      {/* Body */}
      <div class="flex flex-1 flex-col gap-1 p-3">
        <Show when={product().brand}>
          <span class="text-micro font-black uppercase tracking-widest text-ink-muted">
            {product().brand!.name}
          </span>
        </Show>
        <a
          href={href()}
          class="block"
          style={{ "view-transition-name": `product-title-${product().slug}` }}
        >
          <h3 class="line-clamp-2 font-display text-heading font-black uppercase leading-tight tracking-tight text-ink hover:text-orange">
            {product().name}
          </h3>
        </a>
      </div>

      {/* Footer — stamp price tag + add-to-cart */}
      <div class="flex items-end justify-between gap-2 border-t-2 border-ink bg-newsprint p-3">
        <div class="flex flex-col gap-0.5">
          <Show when={onSale()}>
            <span class="font-mono text-micro font-bold text-ink-muted line-through">
              {formatMnt(compareAt()!)}
            </span>
          </Show>
          <span
            class={cn(
              "rotate-[-2deg] border-2 border-ink bg-orange px-2 py-1 font-mono text-caption font-black text-ink shadow-hard-sm",
              onSale() && "bg-pink text-newsprint",
            )}
          >
            {formatMnt(price())}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={soldOut()}
          aria-label={`Add ${product().name} to cart`}
          class={cn(
            "flex size-10 shrink-0 items-center justify-center border-2 border-ink bg-ink text-newsprint shadow-hard-sm",
            "transition-all hover:bg-orange hover:text-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-newsprint",
            pressing() && "animate-stamp-press",
          )}
        >
          <span class="font-display text-lg font-black leading-none">+</span>
          <span class="sr-only">Add to cart</span>
        </button>
      </div>
    </article>
  );
}

/**
 * Deterministic ±1.5deg rotation per product id so the grid feels like a
 * wall of flyers without random layout shift on re-render.
 */
function hashRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 30) / 10 - 1.5;
}
