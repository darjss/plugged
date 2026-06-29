import type { AnyColumn, OrderByOperators } from "drizzle-orm";

/**
 * Relational `orderBy` for product images: primary first, then by
 * sortOrder ascending. Used everywhere product images are eagerly
 * loaded via the relational query API.
 *
 * Pass this directly as the `orderBy` option on a `with.images` block:
 *
 * ```ts
 * images: { orderBy: imageOrderBy, limit: 1 }
 * ```
 *
 * Generic over the columns object drizzle hands the callback so it
 * adapts to any table that exposes `isPrimary` and `sortOrder` columns.
 */
export const imageOrderBy = <TColumns extends { isPrimary: AnyColumn; sortOrder: AnyColumn }>(
  image: TColumns,
  operators: OrderByOperators,
) => [operators.desc(image.isPrimary), operators.asc(image.sortOrder)];
