export type DomainErrorStatus = 400 | 401 | 403 | 404 | 409 | 429;

export class DomainError extends Error {
  readonly status: DomainErrorStatus;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: DomainErrorStatus,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(404, "not-found", `${entity} not found: ${id}`, { entity, id });
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, "validation-error", message, details);
  }
}

export class OutOfStockError extends DomainError {
  readonly variantId: string;
  readonly requested: number;
  readonly available: number;

  constructor(variantId: string, requested: number, available: number) {
    super(
      409,
      "out-of-stock",
      `Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`,
      {
        variantId,
        requested,
        available,
      },
    );
    this.variantId = variantId;
    this.requested = requested;
    this.available = available;
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(409, "conflict", message);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized") {
    super(401, "unauthorized", message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(403, "forbidden", message);
  }
}

export class RateLimitError extends DomainError {
  constructor(message = "Too many requests. Try again shortly.") {
    super(429, "rate-limited", message);
  }
}
