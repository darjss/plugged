import * as v from "valibot";
import { productStatuses } from "../db/schema";
import { id, moneyMnt, optionalText, stockQuantity } from "../lib/validation-primitives";

export const adminUsersQuerySchema = v.object({
  search: v.optional(v.pipe(v.string(), v.minLength(1))),
});

export const adminUpdateUserSchema = v.object({
  isAdmin: v.boolean(),
});

export const adminListProductsSchema = v.object({
  brandId: v.optional(v.nullable(id)),
  categoryId: v.optional(v.nullable(id)),
  status: v.optional(v.picklist(productStatuses)),
  search: v.optional(v.pipe(v.string(), v.minLength(1))),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
  offset: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
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
