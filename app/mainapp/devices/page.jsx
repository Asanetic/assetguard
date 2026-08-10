// app/mainapp/devices/page.jsx
import AppShell from "../shell/AppShell.jsx";
import AllDevices from "./components/AllDevices.jsx";

export const metadata = { title: "All devices · AssetGuard" };

export default function DevicesPage() {
  return (
    <AppShell active="all_devices">
      <AllDevices />
    </AppShell>
  );
}
