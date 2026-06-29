/**
 * Sound signature parsing — shared by the storefront sound signature
 * badge and the spec sheet panel.
 *
 * Tries to parse bass/mid/treble values (0-10) from the raw string.
 * Common formats: "bass:8,mid:7,treble:6", "8/7/6", "B8 M7 T6".
 */

export interface SignatureBars {
  bass: number;
  mid: number;
  treble: number;
}

export function parseSignature(raw: string): SignatureBars | null {
  const text = raw.toLowerCase();

  // Format: "bass:8,mid:7,treble:6" or "bass=8 mid=7 treble=6"
  const named = text.match(
    /bass[:\s=]+(\d+(?:\.\d+)?).*?mid[:\s=]+(\d+(?:\.\d+)?).*?treble[:\s=]+(\d+(?:\.\d+)?)/,
  );
  if (named) {
    return clamp(Number(named[1]), Number(named[2]), Number(named[3]));
  }

  // Format: "8/7/6" or "8 7 6" (three numbers in order bass/mid/treble)
  const triple = text.match(/(\d(?:\.\d+)?)\s*[/\s]\s*(\d(?:\.\d+)?)\s*[/\s]\s*(\d(?:\.\d+)?)/);
  if (triple) {
    return clamp(Number(triple[1]), Number(triple[2]), Number(triple[3]));
  }

  return null;
}

export function clamp(bass: number, mid: number, treble: number): SignatureBars {
  const c = (n: number) => Math.max(0, Math.min(10, Number.isFinite(n) ? n : 0));
  return { bass: c(bass), mid: c(mid), treble: c(treble) };
}
