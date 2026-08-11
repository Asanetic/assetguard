// app/mainapp/ports/page.jsx
import AppShell from "../shell/AppShell.jsx";
import PortsManager from "./components/PortsManager.jsx";

export const metadata = { title: "Listener ports · AssetGuard" };

export default function PortsPage() {
  return (
    <AppShell active="ports">
      <PortsManager />
    </AppShell>
  );
}
