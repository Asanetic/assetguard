// app/mainapp/alarmmaps/page.jsx
import AppShell from "../shell/AppShell.jsx";
import AlarmsMap from "./components/AlarmsMap.jsx";

export const metadata = { title: "Asset Alarms · AssetGuard" };

export default function AlarmsMapPage() {
  return (
    <AppShell active="alarms">
      <AlarmsMap />
    </AppShell>
  );
}
