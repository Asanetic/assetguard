// app/mainapp/devices/add/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import AddDevice from "./components/AddDevice.jsx";

export const metadata = { title: "Add device · AssetGuard" };

export default function AddDevicePage() {
  return (
    <AppShell active="add_device">
      <AddDevice />
    </AppShell>
  );
}
