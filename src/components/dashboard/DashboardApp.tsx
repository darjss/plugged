import { Route, Router } from "@solidjs/router";
import type { ParentProps } from "solid-js";
import { cn } from "@/lib/utils";
import DashboardProviders from "./DashboardProviders";
import DashboardLayout from "./DashboardLayout";
import DashboardHome from "./DashboardHome";

/**
 * Admin SPA. Mounted at `/dashboard/*` via `client:load` in
 * `src/pages/dashboard/index.astro`. The Astro page enforces the admin
 * guard server-side; the router only handles in-shell sub-routes.
 *
 * Route base is `/dashboard` so `<Route path="/">` maps to `/dashboard`
 * and `<Route path="/products">` maps to `/dashboard/products`.
 */

function Placeholder(props: ParentProps & { label: string; issue: string }) {
  return (
    <div
      class={cn(
        "mx-auto max-w-3xl border-2 border-ink bg-card p-8 shadow-hard",
        "flex flex-col gap-2",
      )}
    >
      <h2 class="font-display text-3xl uppercase text-ink">{props.label}</h2>
      <p class="font-mono text-sm text-muted-foreground">Coming in #{props.issue}</p>
      <div class="mt-4 font-body text-foreground/80">
        {props.children ?? "Placeholder content — real view lands in a later issue."}
      </div>
    </div>
  );
}

function ProductsList() {
  return <Placeholder label="Products" issue="14" />;
}
function OrdersList() {
  return <Placeholder label="Orders" issue="15" />;
}
function Analytics() {
  return <Placeholder label="Analytics" issue="17" />;
}
function Settings() {
  return <Placeholder label="Settings" issue="18" />;
}

export default function DashboardApp() {
  return (
    <DashboardProviders>
      <Router root={DashboardLayout} base="/dashboard">
        <Route path="/" component={DashboardHome} />
        <Route path="/products" component={ProductsList} />
        <Route path="/orders" component={OrdersList} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        {/* Fallthrough — unknown sub-routes render the home placeholder. */}
        <Route path="*" component={DashboardHome} />
      </Router>
    </DashboardProviders>
  );
}
