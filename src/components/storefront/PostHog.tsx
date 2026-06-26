import posthog from "posthog-js";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { AnalyticsProperties } from "@/lib/analytics";

const CONSENT_KEY = "plugged-analytics-consent";

type Consent = "accepted" | "declined";

type QueuedEvent = {
  event: string;
  properties?: AnalyticsProperties;
};

function storedConsent(): Consent | null {
  try {
    return localStorage.getItem(CONSENT_KEY) as Consent | null;
  } catch {
    return null;
  }
}

function saveConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {}
}

function doNotTrackEnabled() {
  return navigator.doNotTrack === "1";
}

function capturePageview() {
  posthog.capture("$pageview", {
    path: window.location.pathname,
    search: window.location.search,
    title: document.title,
  });
}

export function useFeatureFlag(key: string): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  return window.posthog?.isFeatureEnabled?.(key);
}

export default function PostHog(props: { apiKey?: string; host?: string }) {
  const [visible, setVisible] = createSignal(false);
  const queue: QueuedEvent[] = [];
  let ready = false;

  const captureQueued = () => {
    while (queue.length > 0) {
      const next = queue.shift()!;
      posthog.capture(next.event, next.properties);
    }
  };

  const init = () => {
    if (ready || !props.apiKey || doNotTrackEnabled()) return;

    posthog.init(props.apiKey, {
      api_host: props.host || "https://us.posthog.com",
      autocapture: true,
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: false,
      respect_dnt: true,
      loaded: () => {
        ready = true;
        capturePageview();
        captureQueued();
      },
    });
    window.posthog = posthog;
  };

  const accept = () => {
    saveConsent("accepted");
    setVisible(false);
    init();
    posthog.opt_in_capturing();
  };

  const decline = () => {
    saveConsent("declined");
    setVisible(false);
    if (ready) posthog.opt_out_capturing();
  };

  const onAnalytics = (event: Event) => {
    const custom = event as CustomEvent<QueuedEvent>;
    if (!custom.detail?.event) return;
    if (!ready) {
      if (storedConsent() === "accepted") queue.push(custom.detail);
      return;
    }
    posthog.capture(custom.detail.event, custom.detail.properties);
  };

  const onPageLoad = () => {
    if (ready) capturePageview();
  };

  onMount(() => {
    const consent = storedConsent();
    if (!consent && !doNotTrackEnabled()) setVisible(true);
    if (consent === "accepted") init();
    if (consent === "declined") posthog.opt_out_capturing();

    window.addEventListener("plugged:analytics", onAnalytics);
    document.addEventListener("astro:page-load", onPageLoad);

    onCleanup(() => {
      window.removeEventListener("plugged:analytics", onAnalytics);
      document.removeEventListener("astro:page-load", onPageLoad);
    });
  });

  return (
    <Show when={visible()}>
      <div class="fixed bottom-4 left-4 right-4 z-[120] border-4 border-ink bg-newsprint-2 p-4 shadow-hard-lg sm:left-auto sm:max-w-md">
        <div class="flex flex-col gap-3">
          <div>
            <p class="font-mono text-micro font-black uppercase tracking-[0.25em] text-orange">
              Tape log / optional
            </p>
            <p class="mt-1 font-display text-2xl uppercase leading-none text-ink">
              Let us count the noise?
            </p>
          </div>
          <p class="font-mono text-xs font-bold uppercase tracking-wide text-ink-muted">
            Analytics helps tune drops, funnels, and busted pages. Do Not Track is respected.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="border-2 border-ink bg-orange px-4 py-2 font-mono text-xs font-black uppercase text-ink shadow-hard-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              onClick={accept}
            >
              Count me in
            </button>
            <button
              type="button"
              class="border-2 border-ink bg-card px-4 py-2 font-mono text-xs font-black uppercase text-ink shadow-hard-sm hover:bg-pink hover:text-newsprint"
              onClick={decline}
            >
              Opt out
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
