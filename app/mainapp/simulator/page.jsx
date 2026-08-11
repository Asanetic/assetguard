// app/mainapp/simulator/page.jsx
import AppShell from "../shell/AppShell.jsx";
import Simulator from "./components/Simulator.jsx";

export const metadata = { title: "Device simulator · AssetGuard" };

export default function SimulatorPage() {
  return (
    <AppShell active="simulator">
      <Simulator />
    </AppShell>
  );
}
