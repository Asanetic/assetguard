// app/mainapp/devices/view/page.jsx
import { Suspense } from "react";
import AppShell from "../../shell/AppShell.jsx";
import ViewDevice from "./components/ViewDevice.jsx";

export const metadata = { title: "Device · AssetGuard" };

export default function ViewDevicePage() {
  return (
    <AppShell active="all_devices">
      <Suspense fallback={null}>
        <ViewDevice />
      </Suspense>
    </AppShell>
  );
}
