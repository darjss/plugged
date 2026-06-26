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

export const checkoutInputSchema = v.object({
  cartToken: id,
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
