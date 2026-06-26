import * as v from "valibot";
import { MONGOLIAN_PHONE_REGEX } from "../../lib/utils";
import {
  deliveryProviders,
  orderStatuses,
  paymentProviders,
  paymentStatuses,
  productStatuses,
} from "../db/schema";

const id = v.pipe(v.string(), v.minLength(1));
const optionalText = v.optional(v.nullable(v.string()));
const moneyMnt = v.pipe(v.number(), v.integer(), v.minValue(0), v.finite());
const stockQuantity = v.pipe(v.number(), v.integer(), v.minValue(0), v.finite());
const positiveQuantity = v.pipe(v.number(), v.integer(), v.minValue(1), v.finite());
const mongolianPhone = v.pipe(v.string(), v.regex(MONGOLIAN_PHONE_REGEX));

export const productListQuerySchema = v.object({
  status: v.optional(v.picklist(productStatuses)),
  categorySlug: v.optional(v.string()),
  brandSlug: v.optional(v.string()),
  featured: v.optional(v.boolean()),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
  offset: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

export const upsertBrandSchema = v.object({
  slug: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: optionalText,
  websiteUrl: optionalText,
});

export const upsertCategorySchema = v.object({
  slug: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: optionalText,
});

export const upsertProductSchema = v.object({
  slug: v.pipe(v.string(), v.minLength(1)),
  brandId: v.optional(v.nullable(id)),
  name: v.pipe(v.string(), v.minLength(1)),
  shortDescription: optionalText,
  description: optionalText,
  status: v.picklist(productStatuses),
  basePriceMnt: moneyMnt,
  compareAtPriceMnt: v.optional(v.nullable(moneyMnt)),
  currency: v.optional(v.literal("MNT")),
  featured: v.optional(v.boolean()),
  categoryIds: v.optional(v.array(id)),
});

export const upsertIemSpecSchema = v.object({
  driverType: optionalText,
  driverConfig: optionalText,
  impedanceOhms: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.finite()))),
  sensitivityDb: optionalText,
  frequencyResponse: optionalText,
  connector: optionalText,
  cable: optionalText,
  mic: v.optional(v.nullable(v.boolean())),
  shellMaterial: optionalText,
  nozzleMaterial: optionalText,
  soundSignature: optionalText,
  fit: optionalText,
  includedAccessories: optionalText,
});

export const upsertProductVariantSchema = v.object({
  sku: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  priceMnt: moneyMnt,
  compareAtPriceMnt: v.optional(v.nullable(moneyMnt)),
  stockQuantity,
  reservedQuantity: v.optional(stockQuantity),
  active: v.optional(v.boolean()),
});

export const productImageSchema = v.object({
  r2Key: optionalText,
  url: v.pipe(v.string(), v.minLength(1)),
  alt: optionalText,
  sortOrder: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.finite())),
  isPrimary: v.optional(v.boolean()),
});

export const cartItemInputSchema = v.object({
  variantId: id,
  quantity: positiveQuantity,
});

export const cartTokenSchema = v.object({
  cartToken: id,
});

export const checkoutItemSchema = v.object({
  variantId: id,
  quantity: positiveQuantity,
});

export const checkoutInputSchema = v.object({
  // Server-side cart flow (legacy): look up items by cart token.
  cartToken: v.optional(id),
  // Client-side cart flow: items sent directly from the storefront.
  // Either `cartToken` or `items` must be present (enforced in createOrder).
  items: v.optional(v.array(checkoutItemSchema)),
  customerPhone: mongolianPhone,
  customerName: v.optional(v.nullable(v.string())),
  address: v.pipe(v.string(), v.minLength(10)),
  deliveryProvider: v.picklist(deliveryProviders),
  notes: optionalText,
  paymentProvider: v.optional(v.picklist(paymentProviders)),
});

export const adminOrderUpdateSchema = v.object({
  status: v.optional(v.picklist(orderStatuses)),
  address: v.optional(v.pipe(v.string(), v.minLength(10))),
  deliveryProvider: v.optional(v.picklist(deliveryProviders)),
  notes: optionalText,
});

export const paymentUpdateSchema = v.object({
  status: v.picklist(paymentStatuses),
  paidAt: v.optional(v.nullable(v.date())),
});

export const createPaymentInputSchema = v.object({
  orderNumber: v.pipe(v.string(), v.minLength(1)),
});

/**
 * Admin order list filters. All fields optional; pagination defaults
 * applied at the query layer.
 */
export const adminListOrdersSchema = v.object({
  status: v.optional(v.picklist(orderStatuses)),
  paymentStatus: v.optional(v.picklist(paymentStatuses)),
  dateFrom: v.optional(v.pipe(v.string(), v.minLength(1))),
  dateTo: v.optional(v.pipe(v.string(), v.minLength(1))),
  search: v.optional(v.pipe(v.string(), v.minLength(1))),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
  offset: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

/* === Admin product management (#14) === */

export const adminListProductsSchema = v.object({
  brandId: v.optional(v.nullable(id)),
  categoryId: v.optional(v.nullable(id)),
  status: v.optional(v.picklist(productStatuses)),
  search: v.optional(v.pipe(v.string(), v.minLength(1))),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
  offset: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

/**
 * Admin order status update. The set of allowed values is the full
 * orderStatuses picklist; transition validity is enforced at the query
 * layer (throws ConflictError on invalid transitions).
 */
export const adminUpdateOrderStatusSchema = v.object({
  status: v.picklist(orderStatuses),
});

const adminVariantSchema = v.object({
  id: v.optional(id),
  sku: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  priceMnt: moneyMnt,
  compareAtPriceMnt: v.optional(v.nullable(moneyMnt)),
  stockQuantity,
  active: v.optional(v.boolean()),
});

const adminIemSpecSchema = v.object({
  driverType: optionalText,
  driverConfig: optionalText,
  impedanceOhms: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.finite()))),
  sensitivityDb: optionalText,
  frequencyResponse: optionalText,
  connector: optionalText,
  cable: optionalText,
  mic: v.optional(v.nullable(v.boolean())),
  shellMaterial: optionalText,
  nozzleMaterial: optionalText,
  soundSignature: optionalText,
  fit: optionalText,
  includedAccessories: optionalText,
  squiglinkFile: optionalText,
});

const adminProductCoreSchema = {
  name: v.pipe(v.string(), v.minLength(1)),
  slug: v.pipe(v.string(), v.minLength(1)),
  brandId: v.optional(v.nullable(id)),
  categoryIds: v.optional(v.array(id)),
  shortDescription: optionalText,
  description: optionalText,
  basePriceMnt: moneyMnt,
  compareAtPriceMnt: v.optional(v.nullable(moneyMnt)),
  status: v.picklist(productStatuses),
  featured: v.optional(v.boolean()),
  variants: v.optional(v.array(adminVariantSchema)),
  iemSpec: v.optional(v.nullable(adminIemSpecSchema)),
};

export const adminCreateProductSchema = v.object(adminProductCoreSchema);

export const adminUpdateProductSchema = v.object({
  name: v.optional(adminProductCoreSchema.name),
  slug: v.optional(adminProductCoreSchema.slug),
  brandId: v.optional(adminProductCoreSchema.brandId),
  categoryIds: v.optional(adminProductCoreSchema.categoryIds),
  shortDescription: v.optional(adminProductCoreSchema.shortDescription),
  description: v.optional(adminProductCoreSchema.description),
  basePriceMnt: v.optional(adminProductCoreSchema.basePriceMnt),
  compareAtPriceMnt: v.optional(adminProductCoreSchema.compareAtPriceMnt),
  status: v.optional(adminProductCoreSchema.status),
  featured: v.optional(adminProductCoreSchema.featured),
  variants: v.optional(adminProductCoreSchema.variants),
  iemSpec: v.optional(adminProductCoreSchema.iemSpec),
});
