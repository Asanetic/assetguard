// app/mainapp/alarms/missed/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import MissedAlarms from "./components/MissedAlarms.jsx";

export const metadata = { title: "Missed alarms · AssetGuard" };

export default function MissedAlarmsPage() {
  return (
    <AppShell active="missed_alarms">
      <MissedAlarms />
    </AppShell>
  );
}
