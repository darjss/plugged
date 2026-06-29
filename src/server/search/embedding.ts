export function getEmbeddingData(output: unknown): number[][] {
  if (output && typeof output === "object" && "data" in output && Array.isArray(output.data)) {
    return output.data.filter((item): item is number[] => Array.isArray(item));
  }
  return [];
}
