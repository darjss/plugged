import * as v from "valibot";

export const id = v.pipe(v.string(), v.minLength(1));

export const nonEmptyString = v.pipe(v.string(), v.minLength(1));

export const optionalText = v.optional(v.nullable(v.string()));

export const moneyMnt = v.pipe(v.number(), v.integer(), v.minValue(0), v.finite());

export const stockQuantity = v.pipe(v.number(), v.integer(), v.minValue(0), v.finite());
