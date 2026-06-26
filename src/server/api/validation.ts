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
