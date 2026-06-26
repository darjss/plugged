import { onMount } from "solid-js";
import { trackAnalytics, type AnalyticsProperties } from "@/lib/analytics";

export default function AnalyticsEvent(props: { event: string; properties?: AnalyticsProperties }) {
  onMount(() => trackAnalytics(props.event, props.properties));
  return null;
}
