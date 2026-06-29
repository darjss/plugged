import { Minus, Plus, ShoppingCart } from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";
import { toast } from "solid-sonner";

import { Button } from "@/components/ui/button";
import { cart, type CartItem } from "@/store/cart";
import { cn, formatMnt } from "@/lib/utils";
import type { ProductVariant } from "@/types/product-types";

interface Props {
  productId: string;
  productSlug: string;
  productName: string;
  basePriceMnt: number;
  compareAtPriceMnt: number | null;
  primaryImage: string;
  variants: ProductVariant[];
}

export default function ProductBuyBox(props: Props) {
  const hasVariants = () => props.variants.length > 0;

  // Select the first in-stock variant, else the first variant.
  const initialVariant = (): ProductVariant | null => {
    if (!hasVariants()) return null;
    const inStock = props.variants.find((v) => v.stockQuantity - v.reservedQuantity > 0);
    return inStock ?? props.variants[0]!;
  };

  const [selectedVariantId, setSelectedVariantId] = createSignal<string | null>(
    initialVariant()?.id ?? null,
  );
  const [quantity, setQuantity] = createSignal(1);

  const selectedVariant = createMemo<ProductVariant | null>(() => {
    if (!hasVariants()) return null;
    return props.variants.find((v) => v.id === selectedVariantId()) ?? null;
  });

  const displayPrice = createMemo(() => {
    if (selectedVariant()) return selectedVariant()!.priceMnt;
    return props.basePriceMnt;
  });

  const displayCompareAt = createMemo<number | null>(() => {
    if (selectedVariant()) return selectedVariant()!.compareAtPriceMnt;
    return props.compareAtPriceMnt;
  });

  const availableStock = createMemo(() => {
    if (selectedVariant()) {
      return Math.max(0, selectedVariant()!.stockQuantity - selectedVariant()!.reservedQuantity);
    }
    // No variants — derive from sum of all variant stock.
    return props.variants.reduce(
      (sum, v) => sum + Math.max(0, v.stockQuantity - v.reservedQuantity),
      0,
    );
  });

  const inStock = createMemo(() => availableStock() > 0);
  const maxQuantity = createMemo(() => Math.min(10, availableStock()));

  const onAddToCart = () => {
    if (!inStock()) return;

    const variant = selectedVariant();
    // If no variants exist, we still need a variantId for the cart.
    // Fall back to the first active variant's id, or empty string.
    const variantId = variant?.id ?? props.variants[0]?.id ?? "";
    if (!variantId) return;

    const item: CartItem = {
      variantId,
      productId: props.productId,
      name: props.productName,
      price: displayPrice(),
      image: props.primaryImage,
      slug: props.productSlug,
      variantName: variant?.name,
      quantity: quantity(),
    };

    cart.add(item);
    toast.success("Added to stash", {
      description: `${quantity()} × ${props.productName}`,
    });
    setQuantity(1);
  };

  const decQty = () => setQuantity((q) => Math.max(1, q - 1));
  const incQty = () => setQuantity((q) => Math.min(maxQuantity(), q + 1));

  return (
    <div class="space-y-5">
      {/* Variant selector */}
      <Show when={hasVariants()}>
        <div class="space-y-2">
          <span class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
            Variant
          </span>
          <div class="flex flex-wrap gap-2">
            <For each={props.variants}>
              {(variant) => {
                const variantStock = () =>
                  Math.max(0, variant.stockQuantity - variant.reservedQuantity);
                const isDisabled = () => variantStock() === 0;
                const isSelected = () => selectedVariantId() === variant.id;
                return (
                  <button
                    type="button"
                    disabled={isDisabled()}
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setQuantity(1);
                    }}
                    aria-pressed={isSelected()}
                    class={cn(
                      "border-2 border-ink px-3 py-2 font-mono text-caption font-black uppercase tracking-wide shadow-hard-sm transition-all",
                      isSelected()
                        ? "bg-orange text-ink shadow-hard"
                        : "bg-newsprint text-ink hover:bg-yellow hover:rotate-1",
                      isDisabled() && "opacity-40 line-through hover:rotate-0 hover:bg-newsprint",
                    )}
                  >
                    {variant.name}
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Price block — stamped */}
      <div class="flex flex-wrap items-end gap-3 border-b-2 border-ink pb-4">
        <div class="flex flex-col">
          <span class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
            Price
          </span>
          <span class="font-mono text-heading-lg font-black tracking-tight text-ink">
            {formatMnt(displayPrice())}
          </span>
        </div>
        <Show when={displayCompareAt() && displayCompareAt()! > displayPrice()}>
          <span class="mb-1 font-mono text-caption font-bold text-ink-muted line-through">
            {formatMnt(displayCompareAt()!)}
          </span>
        </Show>
        <Show when={!inStock()}>
          <span class="mb-1 -rotate-2 border-2 border-ink bg-pink px-2 py-0.5 font-mono text-micro font-black uppercase text-newsprint shadow-hard-sm">
            Sold out
          </span>
        </Show>
        <Show when={inStock() && availableStock() <= 5}>
          <span class="mb-1 rotate-1 border-2 border-ink bg-yellow px-2 py-0.5 font-mono text-micro font-black uppercase text-ink shadow-hard-sm">
            Low stock — {availableStock()} left
          </span>
        </Show>
      </div>

      {/* Quantity + add to cart */}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {/* Quantity selector */}
        <div class="flex items-center border-2 border-ink bg-newsprint-2 shadow-hard-sm">
          <button
            type="button"
            onClick={decQty}
            disabled={quantity() <= 1}
            aria-label="Decrease quantity"
            class="flex size-12 items-center justify-center transition-all hover:bg-orange disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Minus class="size-4" />
          </button>
          <span class="min-w-10 text-center font-mono text-heading font-black">{quantity()}</span>
          <button
            type="button"
            onClick={incQty}
            disabled={quantity() >= maxQuantity()}
            aria-label="Increase quantity"
            class="flex size-12 items-center justify-center transition-all hover:bg-orange disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Plus class="size-4" />
          </button>
        </div>

        {/* Add to cart — hazard-orange primary */}
        <Button
          variant="default"
          size="lg"
          class={cn("flex-1 gap-2 bg-orange text-ink", !inStock() && "opacity-50")}
          disabled={!inStock()}
          onClick={onAddToCart}
        >
          <ShoppingCart class="size-5" />
          {inStock() ? "Add to stash" : "Sold out"}
        </Button>
      </div>
    </div>
  );
}
