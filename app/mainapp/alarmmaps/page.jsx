// app/mainapp/alarmmaps/page.jsx
import { Suspense } from "react";
import AppShell from "../shell/AppShell.jsx";
import AlarmsMap from "./components/AlarmsMap.jsx";

export const metadata = { title: "Asset Alarms · AssetGuard" };

export default function AlarmsMapPage() {
  return (
    <AppShell active="alarms">
      <Suspense fallback={null}>
        <AlarmsMap />
      </Suspense>
    </AppShell>
  );
}
