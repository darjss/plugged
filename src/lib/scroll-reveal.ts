import { onCleanup, onMount } from "solid-js";

import { prefersReducedMotion } from "./motion";

/**
 * Scroll-triggered reveal for grunge product grids. Adds the
 * `stagger-fade-in-up` class (defined in global.css) when an element
 * enters the viewport, with an optional per-element stagger index.
 *
 * Falls back to instant visibility when `prefers-reduced-motion: reduce`
 * is set — elements get the visible end-state with no animation.
 *
 * @example
 * <article ref={(el) => scrollReveal(el, { staggerIndex: i })}>
 *   ...
 * </article>
 */
export function scrollReveal(
  el: HTMLElement,
  options: { staggerIndex?: number; rootMargin?: string } = {},
): void {
  const { staggerIndex = 0, rootMargin = "0px 0px -10% 0px" } = options;

  // Reduced motion: show immediately, no observer overhead.
  if (prefersReducedMotion()) {
    el.style.opacity = "1";
    return;
  }

  // Set the stagger delay token consumed by the CSS utility.
  el.style.setProperty("--stagger-i", String(staggerIndex));
  el.classList.add("stagger-fade-in-up");

  // Pause the animation until the element is in view, then let it run.
  el.style.animationPlayState = "paused";

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.animationPlayState = "running";
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin, threshold: 0.05 },
  );

  onMount(() => observer.observe(el));
  onCleanup(() => observer.unobserve(el));
}
