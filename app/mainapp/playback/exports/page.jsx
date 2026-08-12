// app/mainapp/playback/exports/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import Exports from "./components/Exports.jsx";

export const metadata = { title: "Playback Exports · AssetGuard" };

export default function ExportsPage() {
  return (
    <AppShell active="playback">
      <Exports />
    </AppShell>
  );
}
