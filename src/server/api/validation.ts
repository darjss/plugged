import * as v from "valibot";
import { ValidationError as DomainValidationError } from "../lib/errors";

export function parseInput<TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: TSchema,
  input: unknown,
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, input);

  if (!result.success) {
    const details: Record<string, unknown> = {
      issues: result.issues.map((issue) => ({
        path: v.getDotPath(issue),
        message: issue.message,
        kind: issue.kind,
      })),
    };

    throw new DomainValidationError("Invalid input.", details);
  }

  return result.output;
}

type AnySchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

/**
 * Unwrap optional/nullable wrappers to reach the underlying value schema.
 * Valibot's `pipe` reports the inner type directly on `.type`, so no
 * extra unwrap is needed for pipes.
 */
function unwrapValueSchema(schema: AnySchema): AnySchema {
  let current: AnySchema = schema;
  while (current.type === "optional" || current.type === "nullable") {
    // `wrapped` holds the inner schema for optional/nullable.
    current = (current as unknown as { wrapped: AnySchema }).wrapped;
  }
  return current;
}

/**
 * Coerce a single string query value to the type expected by `valueSchema`.
 * Returns `undefined` when the value should be dropped (empty string for an
 * optional field) so valibot applies its own default/optional handling.
 */
function coerceValue(value: string, type: string): boolean | number | string | undefined {
  switch (type) {
    case "number": {
      if (value.trim() === "") return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    case "boolean":
      if (value === "true" || value === "1") return true;
      if (value === "false" || value === "0") return false;
      return value;
    default:
      return value;
  }
}

/**
 * Parse a raw query-string record (`Record<string, string | undefined>`,
 * as Elysia delivers `query`) against a valibot object schema, coercing
 * numeric and boolean fields from their string forms before validation.
 *
 * This removes the hand-rolled `Number(raw.limit ?? 10)` /
 * `raw.featured === "true"` coercion that was duplicated across route
 * handlers. String fields are passed through unchanged, so a numeric-looking
 * string field (e.g. a phone number) is NOT coerced to a number.
 *
 * Route-specific param aliasing (e.g. `?category=` → `categorySlug`) should
 * be applied to the raw record before calling `parseQuery`.
 */
export function parseQuery<TSchema extends v.ObjectSchema<any, any>>(
  schema: TSchema,
  raw: unknown,
): v.InferOutput<TSchema> {
  const record: Record<string, unknown> = {};
  const source = (raw ?? {}) as Record<string, string | undefined>;

  for (const [key, fieldSchema] of Object.entries(schema.entries)) {
    if (!(key in source)) continue;
    const rawValue = source[key];
    if (rawValue === undefined) continue;

    const valueSchema = unwrapValueSchema(fieldSchema as AnySchema);
    const coerced = coerceValue(rawValue, valueSchema.type);
    if (coerced !== undefined) record[key] = coerced;
  }

  return parseInput(schema, record);
}
