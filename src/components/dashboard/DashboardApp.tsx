import DashboardProviders from "./DashboardProviders";

export default function DashboardApp() {
  return (
    <DashboardProviders>
      <main class="dashboard-shell" aria-label="Dashboard workspace" />
    </DashboardProviders>
  );
}
