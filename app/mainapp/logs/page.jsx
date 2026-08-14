// app/mainapp/logs/page.jsx
import AppShell from "../shell/AppShell.jsx";
import DeviceLogs from "./components/DeviceLogs.jsx";

export const metadata = { title: "Device logs · AssetGuard" };

export default function DeviceLogsPage() {
  return (
    <AppShell active="logs">
      <DeviceLogs />
    </AppShell>
  );
}
