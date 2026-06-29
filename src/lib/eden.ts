interface ErrorEnvelope {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export async function unwrap<T>(
  call: Promise<{ data: unknown; error: { value: unknown } | null }>,
  fallbackMessage = "Request failed",
): Promise<T> {
  const { data, error } = await call;
  if (error || data === null || data === undefined) {
    throw new Error(edErrorMessage(error, fallbackMessage));
  }
  return data as unknown as T;
}

export function edErrorMessage(
  error: { value: unknown } | null | undefined,
  fallback: string,
): string {
  const envelope = error?.value as ErrorEnvelope | undefined;
  return envelope?.error?.message ?? fallback;
}
