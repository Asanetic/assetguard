// app/mainapp/alarms/page.jsx
import AppShell from "../shell/AppShell.jsx";
import AllAlarms from "./components/AllAlarms.jsx";

export const metadata = { title: "All Alarms · AssetGuard" };

export default function AllAlarmsPage() {
  return (
    <AppShell active="all_alarms">
      <AllAlarms />
    </AppShell>
  );
}
