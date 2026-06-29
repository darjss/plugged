import { Route, Router } from "@solidjs/router";

import DashboardProviders from "./DashboardProviders";
import DashboardLayout from "./DashboardLayout";
import DashboardHome from "./DashboardHome";
import SettingsPage from "./SettingsPage";
import ProductsList from "./products/ProductsList";
import ProductForm from "./products/ProductForm";
import OrdersList from "./orders/OrdersList";
import OrderDetail from "./orders/OrderDetail";
import AnalyticsPage from "./AnalyticsPage";

export default function DashboardApp() {
  return (
    <DashboardProviders>
      <Router root={DashboardLayout} base="/dashboard">
        <Route path="/" component={DashboardHome} />
        <Route path="/products" component={ProductsList} />
        <Route path="/products/new" component={ProductForm} />
        <Route path="/products/:id" component={ProductForm} />
        <Route path="/orders" component={OrdersList} />
        <Route path="/orders/:id" component={OrderDetail} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="*" component={DashboardHome} />
      </Router>
    </DashboardProviders>
  );
}
