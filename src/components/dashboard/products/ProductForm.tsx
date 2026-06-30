import { useNavigate, useParams } from "@solidjs/router";
import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { ArrowLeft, Plus, Save, Trash2, Upload, X } from "lucide-solid";
import { createStore, produce } from "solid-js/store";
import {
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
  type Component,
  type JSX,
} from "solid-js";
import { toast } from "solid-sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, CheckboxLabel } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatMnt } from "@/lib/utils";
import {
  adminProductKeys,
  adminProductsApi,
  type AdminProductInput,
  type AdminProductVariant,
} from "@/lib/admin-api";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

const selectClass =
  "h-11 w-full bg-newsprint-2 px-3 py-2 text-sm font-mono border-2 border-ink shadow-hard-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const EMPTY_VARIANT: Omit<AdminProductVariant, "reservedQuantity" | "createdAt" | "updatedAt"> = {
  sku: "",
  name: "Default",
  priceMnt: 0,
  compareAtPriceMnt: null,
  stockQuantity: 0,
  active: true,
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type FormState = {
  name: string;
  slug: string;
  brandId: string;
  categoryIds: string[];
  shortDescription: string;
  description: string;
  basePriceMnt: number;
  compareAtPriceMnt: string;
  status: "draft" | "active" | "archived";
  featured: boolean;
  variants: Array<Omit<AdminProductVariant, "reservedQuantity" | "createdAt" | "updatedAt">>;
  iemSpec: {
    driverType: string;
    driverConfig: string;
    impedanceOhms: string;
    sensitivityDb: string;
    frequencyResponse: string;
    connector: string;
    cable: string;
    mic: boolean;
    shellMaterial: string;
    nozzleMaterial: string;
    soundSignature: string;
    fit: string;
    includedAccessories: string;
    squiglinkFile: string;
  };
};

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  brandId: "",
  categoryIds: [],
  shortDescription: "",
  description: "",
  basePriceMnt: 0,
  compareAtPriceMnt: "",
  status: "draft",
  featured: false,
  variants: [{ ...EMPTY_VARIANT }],
  iemSpec: {
    driverType: "",
    driverConfig: "",
    impedanceOhms: "",
    sensitivityDb: "",
    frequencyResponse: "",
    connector: "",
    cable: "",
    mic: false,
    shellMaterial: "",
    nozzleMaterial: "",
    soundSignature: "",
    fit: "",
    includedAccessories: "",
    squiglinkFile: "",
  },
});

const ProductForm: Component = () => {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const productId = () => params.id;
  const isEdit = () => Boolean(productId());

  const [form, setForm] = createStore<FormState>(emptyForm());
  const [slugTouched, setSlugTouched] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  const [images, setImages] = createSignal<
    Array<{ id: string; url: string; isPrimary: boolean; sortOrder: number }>
  >([]);

  const [brands] = createResource(() => adminProductsApi.listBrands());
  const [categories] = createResource(() => adminProductsApi.listCategories());

  const [productDetail] = createResource(productId, async (id) => {
    if (!id) return null;
    const detail = await adminProductsApi.get(id);
    hydrateForm(detail);
    setImages(
      detail.images.map((img) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })),
    );
    return detail;
  });

  const iemsCategoryId = createMemo(() => {
    const cats = categories();
    if (!cats) return null;
    return cats.find((c) => c.slug === "iems" || c.slug === "iem")?.id ?? null;
  });

  const showIemSpecs = createMemo(() => {
    const iems = iemsCategoryId();
    if (!iems) return false;
    return form.categoryIds.includes(iems);
  });

  function hydrateForm(detail: Awaited<ReturnType<typeof adminProductsApi.get>>) {
    setSlugTouched(true);
    setForm({
      name: detail.name,
      slug: detail.slug,
      brandId: detail.brandId ?? "",
      categoryIds: detail.categoryIds,
      shortDescription: detail.shortDescription ?? "",
      description: detail.description ?? "",
      basePriceMnt: detail.basePriceMnt,
      compareAtPriceMnt: detail.compareAtPriceMnt?.toString() ?? "",
      status: detail.status,
      featured: detail.featured,
      variants:
        detail.variants.length > 0
          ? detail.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              name: v.name,
              priceMnt: v.priceMnt,
              compareAtPriceMnt: v.compareAtPriceMnt,
              stockQuantity: v.stockQuantity,
              active: v.active,
            }))
          : [{ ...EMPTY_VARIANT }],
      iemSpec: {
        driverType: detail.iemSpec?.driverType ?? "",
        driverConfig: detail.iemSpec?.driverConfig ?? "",
        impedanceOhms: detail.iemSpec?.impedanceOhms?.toString() ?? "",
        sensitivityDb: detail.iemSpec?.sensitivityDb ?? "",
        frequencyResponse: detail.iemSpec?.frequencyResponse ?? "",
        connector: detail.iemSpec?.connector ?? "",
        cable: detail.iemSpec?.cable ?? "",
        mic: detail.iemSpec?.mic ?? false,
        shellMaterial: detail.iemSpec?.shellMaterial ?? "",
        nozzleMaterial: detail.iemSpec?.nozzleMaterial ?? "",
        soundSignature: detail.iemSpec?.soundSignature ?? "",
        fit: detail.iemSpec?.fit ?? "",
        includedAccessories: detail.iemSpec?.includedAccessories ?? "",
        squiglinkFile: detail.iemSpec?.squiglinkFile ?? "",
      },
    });
  }

  const onNameInput = (value: string) => {
    setForm("name", value);
    if (!slugTouched()) setForm("slug", slugify(value));
  };

  const buildPayload = (): AdminProductInput => {
    const payload: AdminProductInput = {
      name: form.name,
      slug: form.slug,
      brandId: form.brandId || null,
      categoryIds: form.categoryIds,
      shortDescription: form.shortDescription || null,
      description: form.description || null,
      basePriceMnt: form.basePriceMnt,
      compareAtPriceMnt: form.compareAtPriceMnt ? Number(form.compareAtPriceMnt) : null,
      status: form.status,
      featured: form.featured,
      variants: form.variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku,
        name: v.name,
        priceMnt: v.priceMnt,
        compareAtPriceMnt: v.compareAtPriceMnt,
        stockQuantity: v.stockQuantity,
        active: v.active,
      })),
    };

    if (showIemSpecs()) {
      const s = form.iemSpec;
      payload.iemSpec = {
        driverType: s.driverType || null,
        driverConfig: s.driverConfig || null,
        impedanceOhms: s.impedanceOhms ? Number(s.impedanceOhms) : null,
        sensitivityDb: s.sensitivityDb || null,
        frequencyResponse: s.frequencyResponse || null,
        connector: s.connector || null,
        cable: s.cable || null,
        mic: s.mic,
        shellMaterial: s.shellMaterial || null,
        nozzleMaterial: s.nozzleMaterial || null,
        soundSignature: s.soundSignature || null,
        fit: s.fit || null,
        includedAccessories: s.includedAccessories || null,
        squiglinkFile: s.squiglinkFile || null,
      };
    } else if (isEdit()) {
      payload.iemSpec = null;
    }

    return payload;
  };

  const saveMutation = useMutation(() => ({
    mutationFn: async () => {
      const payload = buildPayload();
      if (isEdit()) {
        return adminProductsApi.update(productId()!, payload);
      }
      return adminProductsApi.create(payload);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      toast.success(isEdit() ? "Product updated" : "Product created");
      navigate(`/products/${result.id}`);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Save failed");
    },
  }));

  const archiveMutation = useMutation(() => ({
    mutationFn: () => adminProductsApi.archive(productId()!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      toast.success("Product archived");
      navigate("/products");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Archive failed");
    },
  }));

  const addVariant = () =>
    setForm("variants", form.variants.length, {
      ...EMPTY_VARIANT,
      name: `Variant ${form.variants.length + 1}`,
    });

  const removeVariant = (index: number) => {
    if (form.variants.length <= 1) return;
    setForm(
      "variants",
      produce((v) => v.splice(index, 1)),
    );
  };

  const toggleCategory = (id: string, checked: boolean) => {
    setForm("categoryIds", (current) =>
      checked ? [...current, id] : current.filter((c) => c !== id),
    );
  };

  const onFileInput = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    if (!isEdit()) {
      toast.error("Save the product before uploading images.");
      input.value = "";
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(input.files)) {
        const img = await adminProductsApi.uploadImage(productId()!, file);
        setImages((prev) => [
          ...prev,
          { id: img.id, url: img.url, isPrimary: img.isPrimary, sortOrder: img.sortOrder },
        ]);
      }
      void queryClient.invalidateQueries({ queryKey: adminProductKeys.detail(productId()!) });
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const onDeleteImage = async (imageId: string) => {
    if (!isEdit()) return;
    try {
      await adminProductsApi.deleteImage(productId()!, imageId);
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      void queryClient.invalidateQueries({ queryKey: adminProductKeys.detail(productId()!) });
      toast.success("Image removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const loading = () => (isEdit() ? productDetail.loading : false);

  return (
    <div class="flex flex-col gap-6">
      {/* Header */}
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
            <ArrowLeft class="size-5" />
          </Button>
          <div>
            <h1 class="font-display text-4xl uppercase leading-none text-ink">
              {isEdit() ? "Edit product" : "New product"}
            </h1>
            <p class="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {isEdit() ? form.slug || "…" : "Create a new catalog entry"}
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <Show when={isEdit()}>
            <Button
              variant="destructive"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              class="gap-2"
            >
              <Trash2 class="size-4" />
              Archive
            </Button>
          </Show>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || loading()}
            class="gap-2"
          >
            <Save class="size-4" />
            {saveMutation.isPending ? "Saving…" : isEdit() ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>

      <Show
        when={!loading()}
        fallback={<div class="font-mono text-sm text-muted-foreground">Loading…</div>}
      >
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div class="flex flex-col gap-6 lg:col-span-2">
            {/* Details card */}
            <section class="border-2 border-ink bg-card p-5 shadow-hard">
              <h2 class="font-display text-2xl uppercase text-ink">Details</h2>
              <Separator class="my-4 bg-ink" />
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Name" required>
                  <Input
                    value={form.name}
                    onInput={(e) => onNameInput(e.currentTarget.value)}
                    placeholder="Moondrop Chu II"
                  />
                </Field>
                <Field label="Slug" required>
                  <Input
                    value={form.slug}
                    onInput={(e) => {
                      setSlugTouched(true);
                      setForm("slug", slugify(e.currentTarget.value));
                    }}
                    placeholder="moondrop-chu-ii"
                  />
                </Field>
                <Field label="Brand">
                  <select
                    class={selectClass}
                    value={form.brandId}
                    onChange={(e) => setForm("brandId", e.currentTarget.value)}
                  >
                    <option value="">Select brand</option>
                    <For each={brands() ?? []}>{(b) => <option value={b.id}>{b.name}</option>}</For>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    class={selectClass}
                    value={form.status}
                    onChange={(e) =>
                      setForm("status", e.currentTarget.value as FormState["status"])
                    }
                  >
                    <For each={STATUS_OPTIONS}>
                      {(s) => <option value={s.value}>{s.label}</option>}
                    </For>
                  </select>
                </Field>
                <Field label="Base price (MNT)" required>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.basePriceMnt}
                    onInput={(e) => setForm("basePriceMnt", Number(e.currentTarget.value) || 0)}
                  />
                </Field>
                <Field label="Compare-at price (MNT)">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.compareAtPriceMnt}
                    onInput={(e) => setForm("compareAtPriceMnt", e.currentTarget.value)}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Short description" full>
                  <Input
                    value={form.shortDescription}
                    onInput={(e) => setForm("shortDescription", e.currentTarget.value)}
                    placeholder="One-line summary"
                  />
                </Field>
                <Field label="Full description" full>
                  <Textarea
                    rows={5}
                    value={form.description}
                    onInput={(e) => setForm("description", e.currentTarget.value)}
                    placeholder="Full product description…"
                  />
                </Field>
                <div class="flex items-center gap-3 md:col-span-2">
                  <Checkbox
                    id="featured"
                    checked={form.featured}
                    onChange={(checked) => setForm("featured", checked)}
                  >
                    <CheckboxLabel for="featured" class="font-mono text-sm">
                      Featured on homepage
                    </CheckboxLabel>
                  </Checkbox>
                </div>
              </div>
            </section>

            {/* Categories */}
            <section class="border-2 border-ink bg-card p-5 shadow-hard">
              <h2 class="font-display text-2xl uppercase text-ink">Categories</h2>
              <Separator class="my-4 bg-ink" />
              <Show
                when={categories()}
                fallback={
                  <div class="font-mono text-sm text-muted-foreground">Loading categories…</div>
                }
              >
                {(cats) => (
                  <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <For each={cats()}>
                      {(cat) => {
                        const checked = () => form.categoryIds.includes(cat.id);
                        return (
                          <div class="flex items-center gap-2 border-2 border-ink bg-newsprint-2 p-2">
                            <Checkbox
                              id={`cat-${cat.id}`}
                              checked={checked()}
                              onChange={(c) => toggleCategory(cat.id, c)}
                            >
                              <CheckboxLabel for={`cat-${cat.id}`} class="font-mono text-sm">
                                {cat.name}
                              </CheckboxLabel>
                            </Checkbox>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                )}
              </Show>
            </section>

            {/* IEM specs */}
            <Show when={showIemSpecs()}>
              <section class="border-2 border-ink bg-card p-5 shadow-hard">
                <h2 class="font-display text-2xl uppercase text-ink">IEM specs</h2>
                <Separator class="my-4 bg-ink" />
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Driver type">
                    <Input
                      value={form.iemSpec.driverType}
                      onInput={(e) => setForm("iemSpec", "driverType", e.currentTarget.value)}
                      placeholder="Dynamic"
                    />
                  </Field>
                  <Field label="Driver config">
                    <Input
                      value={form.iemSpec.driverConfig}
                      onInput={(e) => setForm("iemSpec", "driverConfig", e.currentTarget.value)}
                      placeholder="1DD"
                    />
                  </Field>
                  <Field label="Impedance (Ω)">
                    <Input
                      type="number"
                      min="0"
                      value={form.iemSpec.impedanceOhms}
                      onInput={(e) => setForm("iemSpec", "impedanceOhms", e.currentTarget.value)}
                      placeholder="32"
                    />
                  </Field>
                  <Field label="Sensitivity">
                    <Input
                      value={form.iemSpec.sensitivityDb}
                      onInput={(e) => setForm("iemSpec", "sensitivityDb", e.currentTarget.value)}
                      placeholder="110dB/mW"
                    />
                  </Field>
                  <Field label="Frequency response">
                    <Input
                      value={form.iemSpec.frequencyResponse}
                      onInput={(e) =>
                        setForm("iemSpec", "frequencyResponse", e.currentTarget.value)
                      }
                      placeholder="20Hz-20kHz"
                    />
                  </Field>
                  <Field label="Connector">
                    <Input
                      value={form.iemSpec.connector}
                      onInput={(e) => setForm("iemSpec", "connector", e.currentTarget.value)}
                      placeholder="0.78mm 2-pin"
                    />
                  </Field>
                  <Field label="Cable">
                    <Input
                      value={form.iemSpec.cable}
                      onInput={(e) => setForm("iemSpec", "cable", e.currentTarget.value)}
                      placeholder="OFC, 1.2m"
                    />
                  </Field>
                  <Field label="Shell material">
                    <Input
                      value={form.iemSpec.shellMaterial}
                      onInput={(e) => setForm("iemSpec", "shellMaterial", e.currentTarget.value)}
                      placeholder="Resin"
                    />
                  </Field>
                  <Field label="Nozzle material">
                    <Input
                      value={form.iemSpec.nozzleMaterial}
                      onInput={(e) => setForm("iemSpec", "nozzleMaterial", e.currentTarget.value)}
                    />
                  </Field>
                  <Field label="Sound signature">
                    <Input
                      value={form.iemSpec.soundSignature}
                      onInput={(e) => setForm("iemSpec", "soundSignature", e.currentTarget.value)}
                      placeholder="V-shaped"
                    />
                  </Field>
                  <Field label="Fit">
                    <Input
                      value={form.iemSpec.fit}
                      onInput={(e) => setForm("iemSpec", "fit", e.currentTarget.value)}
                    />
                  </Field>
                  <Field label="Squiglink file">
                    <Input
                      value={form.iemSpec.squiglinkFile}
                      onInput={(e) => setForm("iemSpec", "squiglinkFile", e.currentTarget.value)}
                      placeholder="moondrop-chu-ii.txt"
                    />
                  </Field>
                  <Field label="Included accessories" full>
                    <Textarea
                      rows={2}
                      value={form.iemSpec.includedAccessories}
                      onInput={(e) =>
                        setForm("iemSpec", "includedAccessories", e.currentTarget.value)
                      }
                    />
                  </Field>
                  <div class="flex items-center gap-3 md:col-span-2">
                    <Checkbox
                      id="iem-mic"
                      checked={form.iemSpec.mic}
                      onChange={(c) => setForm("iemSpec", "mic", c)}
                    >
                      <CheckboxLabel for="iem-mic" class="font-mono text-sm">
                        Has microphone
                      </CheckboxLabel>
                    </Checkbox>
                  </div>
                </div>
              </section>
            </Show>

            {/* Variants */}
            <section class="border-2 border-ink bg-card p-5 shadow-hard">
              <div class="flex items-center justify-between">
                <h2 class="font-display text-2xl uppercase text-ink">Variants</h2>
                <Button variant="outline" size="sm" onClick={addVariant} class="gap-2">
                  <Plus class="size-4" /> Add variant
                </Button>
              </div>
              <Separator class="my-4 bg-ink" />
              <div class="flex flex-col gap-3">
                <For each={form.variants}>
                  {(variant, index) => (
                    <div class="grid grid-cols-1 gap-2 border-2 border-ink bg-newsprint-2 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                      <Field label="SKU">
                        <Input
                          value={variant.sku}
                          onInput={(e) =>
                            setForm("variants", index(), "sku", e.currentTarget.value)
                          }
                        />
                      </Field>
                      <Field label="Name">
                        <Input
                          value={variant.name}
                          onInput={(e) =>
                            setForm("variants", index(), "name", e.currentTarget.value)
                          }
                        />
                      </Field>
                      <Field label="Price (MNT)">
                        <Input
                          type="number"
                          min="0"
                          value={variant.priceMnt}
                          onInput={(e) =>
                            setForm(
                              "variants",
                              index(),
                              "priceMnt",
                              Number(e.currentTarget.value) || 0,
                            )
                          }
                        />
                      </Field>
                      <Field label="Stock">
                        <Input
                          type="number"
                          min="0"
                          value={variant.stockQuantity}
                          onInput={(e) =>
                            setForm(
                              "variants",
                              index(),
                              "stockQuantity",
                              Number(e.currentTarget.value) || 0,
                            )
                          }
                        />
                      </Field>
                      <div class="flex items-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(index())}
                          disabled={form.variants.length <= 1}
                        >
                          <X class="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </section>
          </div>

          {/* Sidebar: images */}
          <aside class="flex flex-col gap-4">
            <section class="border-2 border-ink bg-card p-5 shadow-hard">
              <h2 class="font-display text-2xl uppercase text-ink">Images</h2>
              <Separator class="my-4 bg-ink" />
              <Show
                when={isEdit()}
                fallback={
                  <p class="font-mono text-xs text-muted-foreground">
                    Save the product first, then upload images.
                  </p>
                }
              >
                <label class="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-ink bg-newsprint-2 p-6 text-center transition-colors hover:bg-primary/10">
                  <Upload class="size-6 text-muted-foreground" />
                  <span class="font-mono text-xs uppercase tracking-wide">
                    {uploading() ? "Uploading…" : "Drop or click to upload"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    class="hidden"
                    onChange={onFileInput}
                    disabled={uploading()}
                  />
                </label>

                <div class="mt-4 flex flex-col gap-2">
                  <For each={images()}>
                    {(img) => (
                      <div class="flex items-center gap-3 border-2 border-ink bg-newsprint-2 p-2">
                        <img
                          src={img.url}
                          alt=""
                          class="size-14 border-2 border-ink object-cover"
                        />
                        <div class="min-w-0 flex-1">
                          <Show when={img.isPrimary}>
                            <Badge variant="highlighter">Primary</Badge>
                          </Show>
                          <div class="truncate font-mono text-xs text-muted-foreground">
                            {img.url}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDeleteImage(img.id)}
                        >
                          <X class="size-4" />
                        </Button>
                      </div>
                    )}
                  </For>
                  <Show when={images().length === 0}>
                    <p class="font-mono text-xs text-muted-foreground">No images yet.</p>
                  </Show>
                </div>
              </Show>
            </section>

            <section class="border-2 border-ink bg-card p-5 shadow-hard">
              <h2 class="font-display text-xl uppercase text-ink">Summary</h2>
              <Separator class="my-3 bg-ink" />
              <dl class="flex flex-col gap-2 font-mono text-xs">
                <SummaryRow label="Price" value={formatMnt(form.basePriceMnt)} />
                <SummaryRow label="Status" value={form.status} />
                <SummaryRow label="Featured" value={form.featured ? "Yes" : "No"} />
                <SummaryRow label="Variants" value={String(form.variants.length)} />
                <SummaryRow label="Images" value={String(images().length)} />
              </dl>
            </section>
          </aside>
        </div>
      </Show>
    </div>
  );
};

function Field(props: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: JSX.Element;
}) {
  return (
    <div class={cn("flex flex-col gap-1.5", props.full && "md:col-span-2")}>
      <Label>
        {props.label}
        <Show when={props.required}>
          <span class="text-pink">*</span>
        </Show>
      </Label>
      {props.children}
    </div>
  );
}

function SummaryRow(props: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between">
      <dt class="uppercase tracking-wide text-muted-foreground">{props.label}</dt>
      <dd class="font-bold text-foreground">{props.value}</dd>
    </div>
  );
}

export default ProductForm;
