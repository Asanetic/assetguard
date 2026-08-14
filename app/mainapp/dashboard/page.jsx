// app/mainapp/dashboard/page.jsx
import AppShell from "../shell/AppShell.jsx";
import Dashboard from "./components/Dashboard.jsx";

export const metadata = { title: "Dashboard · AssetGuard" };

export default function DashboardPage() {
  return (
    <AppShell active="dashboard">
      <Dashboard />
    </AppShell>
  );
}
