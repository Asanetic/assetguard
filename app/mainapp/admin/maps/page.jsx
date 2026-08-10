// app/mainapp/admin/maps/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import MapsControl from "./components/MapsControl.jsx";

export const metadata = { title: "Google Maps · AssetGuard" };

export default function MapsControlPage() {
  return (
    <AppShell active="maps">
      <MapsControl />
    </AppShell>
  );
}
