import * as v from "valibot";

/** Non-empty string id (used for entity ids in routes/schemas). */
export const id = v.pipe(v.string(), v.minLength(1));

/** Optional nullable text — common shape for free-form optional fields. */
export const optionalText = v.optional(v.nullable(v.string()));

/** Non-negative integer MNT amount in the smallest currency unit. */
export const moneyMnt = v.pipe(v.number(), v.integer(), v.minValue(0), v.finite());

/** Non-negative integer quantity (stock, reserved, etc.). */
export const stockQuantity = v.pipe(v.number(), v.integer(), v.minValue(0), v.finite());
