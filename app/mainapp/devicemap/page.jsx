// app/mainapp/devicemap/page.jsx
import AppShell from "../shell/AppShell.jsx";
import DevicesMap from "./components/DevicesMap.jsx";

export const metadata = { title: "Devices map · AssetGuard" };

export default function DevicesMapPage() {
  return (
    <AppShell active="devices">
      <DevicesMap />
    </AppShell>
  );
}
