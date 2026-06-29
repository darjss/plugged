import { api } from "@/lib/api-client";

export async function unwrap<T>(
  call: Promise<{ data: unknown; error: { value: unknown } | null }>,
  fallbackMessage = "Request failed",
): Promise<T> {
  const { data, error } = await call;
  if (error || data === null || data === undefined) {
    const envelope = error?.value as { error?: { message?: string } } | undefined;
    throw new Error(envelope?.error?.message ?? fallbackMessage);
  }
  return data as unknown as T;
}

export { api };
