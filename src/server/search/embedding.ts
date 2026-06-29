/**
 * Extract the numeric embedding vectors from a Workers AI
 * `@cf/baai/bge-base-en-v1.5` response. The runtime shape is
 * `{ data: number[][] }`; the helper tolerates missing/malformed data
 * by returning an empty array.
 */
export function getEmbeddingData(output: unknown): number[][] {
  if (output && typeof output === "object" && "data" in output && Array.isArray(output.data)) {
    return output.data.filter((item): item is number[] => Array.isArray(item));
  }
  return [];
}
