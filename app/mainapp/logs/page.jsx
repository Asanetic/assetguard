// app/mainapp/logs/page.jsx
import AppShell from "../shell/AppShell.jsx";
import Heartbeats from "./components/Heartbeats.jsx";

export const metadata = { title: "Heartbeats · AssetGuard" };

export default function HeartbeatsPage() {
  return (
    <AppShell active="logs">
      <Heartbeats />
    </AppShell>
  );
}
