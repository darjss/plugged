import { spring } from "@motionone/dom";
import { onCleanup } from "solid-js";
import { createSignal } from "solid-js";

/**
 * Grunge motion config — sharp ease-out with slight overshoot, never
 * bounce or elastic (DESIGN.md motion rules). Curves mirror the CSS
 * custom properties in global.css so JS and CSS animations feel the same.
 */
export const easings = {
  /** Sharp ease-out — general UI motion. */
  outQuart: [0.25, 1, 0.5, 1] as const,
  /** Expo ease-out — page transitions, hero reveals. */
  outExpo: [0.16, 1, 0.3, 1] as const,
} satisfies Record<string, readonly [number, number, number, number]>;

/**
 * Spring presets for motion-one. Slightly underdamped so elements settle
 * with a tiny physical overshoot — photocopied-flyer energy, not rubber.
 * Pass these to `spring()` to get an `EasingGenerator` for the `easing`
 * field of a motion-one transition.
 */
export const springPresets = {
  /** Cart drawer — quick snap from the right edge. */
  drawer: { stiffness: 320, damping: 34, mass: 0.9 },
  /** Toast / stamp press — snappy pop. */
  stamp: { stiffness: 600, damping: 22, mass: 0.6 },
} as const;

/**
 * Pre-built spring easing generators for motion-one transitions.
 * Use as the `easing` field: `transition={{ easing: springEasings.drawer }}`.
 */
export const springEasings = {
  drawer: spring(springPresets.drawer),
  stamp: spring(springPresets.stamp),
} as const;

/**
 * Default transition for motion-one components — matches the grunge
 * `--ease-out-expo` curve used by the CSS keyframe utilities.
 */
export const defaultTransition = {
  duration: 0.4,
  easing: easings.outExpo,
} as const;

/**
 * Read `prefers-reduced-motion: reduce` synchronously at signal creation.
 * Client-only islands (client:only) run this in the browser, so
 * `window.matchMedia` is available immediately — no onMount delay.
 * Returns false on the server (no window).
 */
function readReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Reactively tracks `prefers-reduced-motion: reduce`. Initializes
 * SYNCHRONOUSLY from `window.matchMedia` so the first render respects
 * the user's preference — no flash of full animation for reduced-motion
 * users. Use in client-only islands where `window` is available.
 *
 * For SSR-compatible islands, gate Motion props with `initial={false}`
 * until the preference is known.
 */
export function createPrefersReducedMotion() {
  const [reduced, setReduced] = createSignal(readReducedMotion());

  // Subscribe to changes. Wrapped in a guard for SSR / old browsers.
  if (typeof window !== "undefined") {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    onCleanup(() => mq.removeEventListener("change", onChange));
  }

  return reduced;
}

/**
 * Imperative reduced-motion check for non-reactive call sites
 * (event handlers, IntersectionObserver callbacks). Returns false on
 * the server.
 */
export function prefersReducedMotion(): boolean {
  return readReducedMotion();
}
