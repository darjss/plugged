import * as v from "valibot";

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly issues: v.InferIssue<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>[],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function parseInput<TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: TSchema,
  input: unknown,
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, input);

  if (!result.success) {
    throw new ValidationError("Invalid input.", result.issues);
  }

  return result.output;
}

export function validationFailure(error: unknown) {
  if (error instanceof ValidationError) {
    return {
      error: error.message,
      issues: error.issues,
      ok: false,
    };
  }

  return null;
}
