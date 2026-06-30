import { Route, Router } from "@solidjs/router";
import type { JSX } from "solid-js";

import DashboardProviders from "./DashboardProviders";
import DashboardLayout from "./DashboardLayout";
import DashboardHome from "./DashboardHome";
import SettingsPage from "./SettingsPage";
import ProductsList from "./products/ProductsList";
import ProductForm from "./products/ProductForm";
import OrdersList from "./orders/OrdersList";
import OrderDetail from "./orders/OrderDetail";
import AnalyticsPage from "./AnalyticsPage";

/**
 * Admin SPA. Mounted at `/dashboard/*` via `client:load` in
 * `src/pages/dashboard/index.astro` (and `[...slug].astro` for deep
 * links). The Astro page enforces the admin guard server-side; the
 * router only handles in-shell sub-routes.
 *
 * Route base is `/dashboard` so `<Route path="/">` maps to `/dashboard`
 * and `<Route path="/products">` maps to `/dashboard/products`.
 *
 * `url` is passed from the Astro page so the SolidJS `StaticRouter` can
 * match the correct route during SSR. Without it, `getRequestEvent()`
 * returns `undefined` in the Astro-island context, the router defaults
 * to the `base` path, and every deep link renders the `/` fallthrough.
 * On the client the `url` prop is ignored — `Router` uses
 * `window.location` when `isServer` is false.
 */

export default function DashboardApp(props: { url?: string }): JSX.Element {
  return (
    <DashboardProviders>
      <Router root={DashboardLayout} base="/dashboard" url={props.url}>
        <Route path="/" component={DashboardHome} />
        <Route path="/products" component={ProductsList} />
        <Route path="/products/new" component={ProductForm} />
        <Route path="/products/:id" component={ProductForm} />
        <Route path="/orders" component={OrdersList} />
        <Route path="/orders/:id" component={OrderDetail} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/settings" component={SettingsPage} />
        {/* Fallthrough — unknown sub-routes render the home placeholder. */}
        <Route path="*" component={DashboardHome} />
      </Router>
    </DashboardProviders>
  );
}
