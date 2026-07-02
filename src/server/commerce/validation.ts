import * as v from "valibot";
import { MONGOLIAN_PHONE_REGEX } from "../../lib/utils";
import {
  deliveryProviders,
  orderStatuses,
  paymentProviders,
  paymentStatuses,
  productStatuses,
} from "../db/schema";
import { id, optionalText } from "../lib/validation-primitives";

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

/**
 * Admin order status update. The set of allowed values is the full
 * orderStatuses picklist; transition validity is enforced at the query
 * layer (throws ConflictError on invalid transitions).
 */
export const adminUpdateOrderStatusSchema = v.object({
  status: v.picklist(orderStatuses),
});
