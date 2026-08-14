// app/mainapp/reports/page.jsx
import AppShell from "../shell/AppShell.jsx";
import Reports from "./components/Reports.jsx";

export const metadata = { title: "Reports · AssetGuard" };

export default function ReportsPage() {
  return (
    <AppShell active="reports">
      <Reports />
    </AppShell>
  );
}
