import posthog from "posthog-js";
import { onCleanup, onMount } from "solid-js";
import type { AnalyticsProperties } from "@/lib/analytics";

type QueuedEvent = {
  event: string;
  properties?: AnalyticsProperties;
};

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
      disable_session_recording: true,
      respect_dnt: true,
      loaded: () => {
        ready = true;
        capturePageview();
        captureQueued();
      },
    });
    window.posthog = posthog;
  };

  const onAnalytics = (event: Event) => {
    const custom = event as CustomEvent<QueuedEvent>;
    if (!custom.detail?.event) return;
    if (!ready) {
      queue.push(custom.detail);
      return;
    }
    posthog.capture(custom.detail.event, custom.detail.properties);
  };

  const onPageLoad = () => {
    if (ready) capturePageview();
  };

  onMount(() => {
    init();

    window.addEventListener("plugged:analytics", onAnalytics);
    document.addEventListener("astro:page-load", onPageLoad);

    onCleanup(() => {
      window.removeEventListener("plugged:analytics", onAnalytics);
      document.removeEventListener("astro:page-load", onPageLoad);
    });
  });

  return null;
}
