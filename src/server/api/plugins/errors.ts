import { Elysia } from "elysia";
import { DomainError } from "../../lib/errors";

/**
 * Global error handler as a named plugin so its response types fold into
 * every route module that `.use()`s it (a parent-level `.onError` only
 * types routes registered on the same instance chain). `DomainError.status`
 * is a literal union (400 | 401 | 403 | 404 | 409 | 429), so Eden maps each
 * status to the envelope instead of polluting the 200 slot.
 */
export const errorHandlerPlugin = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ code, error, status }) => {
    if (code === "VALIDATION") {
      return status(400, {
        error: {
          code: "validation-error",
          message: error instanceof Error ? error.message : "Invalid input.",
          details: undefined,
        },
      });
    }

    if (error instanceof DomainError) {
      return status(error.status, {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }

    // Log the actual error so unexpected throws (Drizzle/D1, better-auth
    // internals, Elysia ParseError) don't vanish in production.
    console.error("[api] unhandled error", error);

    return status(500, {
      error: {
        code: "internal-error",
        message: "Internal server error",
      },
    });
  },
);
