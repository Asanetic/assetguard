// app/mainapp/admin/messaging/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import MessagingSettings from "./components/MessagingSettings.jsx";

export const metadata = { title: "Email & SMS · AssetGuard" };

export default function MessagingSettingsPage() {
  return (
    <AppShell active="messaging">
      <MessagingSettings />
    </AppShell>
  );
}
