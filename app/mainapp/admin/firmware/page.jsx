// app/mainapp/admin/firmware/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import FirmwareControl from "./components/FirmwareControl.jsx";

export const metadata = { title: "Firmware · AssetGuard" };

export default function FirmwarePage() {
  return (
    <AppShell active="firmware">
      <FirmwareControl />
    </AppShell>
  );
}
