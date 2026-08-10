// app/mainapp/admin/settings/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import SystemSettings from "./components/SystemSettings.jsx";

export const metadata = { title: "Settings · AssetGuard" };

export default function SettingsPage() {
  return (
    <AppShell active="settings">
      <SystemSettings />
    </AppShell>
  );
}
