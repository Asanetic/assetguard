// app/mainapp/devices/group/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import GroupDevices from "./components/GroupDevices.jsx";

export const metadata = { title: "Group devices · AssetGuard" };

export default function GroupDevicesPage() {
  return (
    <AppShell active="group_devices">
      <GroupDevices />
    </AppShell>
  );
}
