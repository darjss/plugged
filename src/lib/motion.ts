import { spring } from "@motionone/dom";
import { onCleanup } from "solid-js";
import { createSignal } from "solid-js";

export const easings = {
  outQuart: [0.25, 1, 0.5, 1] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
} satisfies Record<string, readonly [number, number, number, number]>;

export const springPresets = {
  drawer: { stiffness: 320, damping: 34, mass: 0.9 },
  stamp: { stiffness: 600, damping: 22, mass: 0.6 },
} as const;

export const springEasings = {
  drawer: spring(springPresets.drawer),
  stamp: spring(springPresets.stamp),
} as const;

export const defaultTransition = {
  duration: 0.4,
  easing: easings.outExpo,
} as const;

function readReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function createPrefersReducedMotion() {
  const [reduced, setReduced] = createSignal(readReducedMotion());

  if (typeof window !== "undefined") {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    onCleanup(() => mq.removeEventListener("change", onChange));
  }

  return reduced;
}

export function prefersReducedMotion(): boolean {
  return readReducedMotion();
}
