import { useNavigate } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { ImageOff, Package, Plus, Search } from "lucide-solid";
import { createSignal, For, Show, type Component } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMnt } from "@/lib/utils";
import { adminProductKeys, adminProductsApi, type AdminProductListFilters } from "@/lib/admin-api";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

const PAGE_SIZE = 25;

const statusVariant: Record<string, "default" | "secondary" | "outline" | "warning"> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

const selectClass =
  "h-10 w-full bg-newsprint-2 px-3 py-2 text-sm font-mono border-2 border-ink shadow-hard-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ProductsList: Component = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = createSignal<AdminProductListFilters>({
    brandId: null,
    categoryId: null,
    status: null,
    search: null,
    limit: PAGE_SIZE,
    offset: 0,
  });

  const [searchInput, setSearchInput] = createSignal("");

  const brands = createQuery(() => ({
    queryKey: adminProductKeys.brands,
    queryFn: () => adminProductsApi.listBrands(),
    staleTime: 5 * 60_000,
  }));

  const categories = createQuery(() => ({
    queryKey: adminProductKeys.categories,
    queryFn: () => adminProductsApi.listCategories(),
    staleTime: 5 * 60_000,
  }));

  const products = createQuery(() => ({
    queryKey: adminProductKeys.list(filters()),
    queryFn: () => adminProductsApi.list(filters()),
  }));

  const currentPage = () => Math.floor((filters().offset ?? 0) / PAGE_SIZE) + 1;
  const totalPages = () => Math.max(1, Math.ceil((products.data?.total ?? 0) / PAGE_SIZE));

  const applySearch = () => {
    setFilters((f) => ({ ...f, search: searchInput().trim() || null, offset: 0 }));
  };

  const resetFilters = () => {
    setSearchInput("");
    setFilters({
      brandId: null,
      categoryId: null,
      status: null,
      search: null,
      limit: PAGE_SIZE,
      offset: 0,
    });
  };

  const goToProduct = (id: string) => navigate(`/products/${id}`);

  return (
    <div class="flex flex-col gap-6">
      {/* Header */}
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-4xl uppercase leading-none text-ink">Products</h1>
          <p class="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Manage the IEM catalog
          </p>
        </div>
        <Button onClick={() => navigate("/products/new")} class="gap-2">
          <Plus class="size-4" />
          New product
        </Button>
      </div>

      {/* Filters */}
      <div class="grid grid-cols-1 gap-3 border-2 border-ink bg-card p-4 shadow-hard md:grid-cols-4">
        <div class="flex items-center gap-2">
          <Search class="size-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search name or slug…"
            value={searchInput()}
            onInput={(e) => setSearchInput(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            class="h-10"
          />
        </div>

        <select
          class={selectClass}
          value={filters().brandId ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, brandId: e.currentTarget.value || null, offset: 0 }))
          }
        >
          <option value="">All brands</option>
          <For each={brands.data ?? []}>{(b) => <option value={b.id}>{b.name}</option>}</For>
        </select>

        <select
          class={selectClass}
          value={filters().categoryId ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, categoryId: e.currentTarget.value || null, offset: 0 }))
          }
        >
          <option value="">All categories</option>
          <For each={categories.data ?? []}>{(c) => <option value={c.id}>{c.name}</option>}</For>
        </select>

        <select
          class={selectClass}
          value={filters().status ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: (e.currentTarget.value as AdminProductListFilters["status"]) || null,
              offset: 0,
            }))
          }
        >
          <For each={STATUS_OPTIONS}>{(s) => <option value={s.value}>{s.label}</option>}</For>
        </select>

        <div class="flex items-center gap-2 md:col-span-4">
          <Button variant="outline" size="sm" onClick={applySearch} class="h-10">
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={resetFilters} class="h-10">
            Reset
          </Button>
        </div>
      </div>

      {/* Table */}
      <Show
        when={products.data}
        fallback={
          <div class="flex items-center justify-center border-2 border-ink bg-card p-12 shadow-hard">
            <Package class="size-6 animate-pulse text-muted-foreground" />
            <span class="ml-3 font-mono text-sm text-muted-foreground">Loading products…</span>
          </div>
        }
      >
        {(data) => (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead class="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-right">Stock</TableHead>
                  <TableHead class="text-right">Variants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Show
                  when={data().items.length > 0}
                  fallback={
                    <TableRow>
                      <TableCell colspan={7} class="py-12 text-center text-muted-foreground">
                        No products match these filters.
                      </TableCell>
                    </TableRow>
                  }
                >
                  <For each={data().items}>
                    {(item) => (
                      <TableRow class="cursor-pointer" onClick={() => goToProduct(item.id)}>
                        <TableCell>
                          <Show
                            when={item.thumbnail}
                            fallback={
                              <div class="flex size-12 items-center justify-center border-2 border-ink bg-newsprint-dark">
                                <ImageOff class="size-4 text-muted-foreground" />
                              </div>
                            }
                          >
                            <img
                              src={item.thumbnail ?? ""}
                              alt={item.name}
                              class="size-12 border-2 border-ink object-cover"
                            />
                          </Show>
                        </TableCell>
                        <TableCell>
                          <div class="font-heading text-sm font-bold text-foreground">
                            {item.name}
                          </div>
                          <div class="font-mono text-xs text-muted-foreground">{item.slug}</div>
                          <Show when={item.featured}>
                            <Badge variant="highlighter" class="mt-1">
                              Featured
                            </Badge>
                          </Show>
                        </TableCell>
                        <TableCell class="text-sm">{item.brand?.name ?? "—"}</TableCell>
                        <TableCell class="text-right">
                          <div class="font-mono text-sm font-bold">
                            {formatMnt(item.basePriceMnt)}
                          </div>
                          <Show when={item.compareAtPriceMnt}>
                            <div class="font-mono text-xs text-muted-foreground line-through">
                              {formatMnt(item.compareAtPriceMnt ?? 0)}
                            </div>
                          </Show>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[item.status] ?? "outline"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell class="text-right font-mono">{item.stock}</TableCell>
                        <TableCell class="text-right font-mono">{item.variantCount}</TableCell>
                      </TableRow>
                    )}
                  </For>
                </Show>
              </TableBody>
            </Table>

            {/* Pagination */}
            <div class="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-card p-3 shadow-hard-sm">
              <div class="font-mono text-xs text-muted-foreground">
                {data().total} total · page {currentPage()} of {totalPages()}
              </div>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage() <= 1}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      offset: Math.max(0, (f.offset ?? 0) - PAGE_SIZE),
                    }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage() >= totalPages()}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      offset: (f.offset ?? 0) + PAGE_SIZE,
                    }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Show>
    </div>
  );
};

export default ProductsList;
