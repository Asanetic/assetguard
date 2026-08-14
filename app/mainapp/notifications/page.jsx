// app/mainapp/notifications/page.jsx
import AppShell from "../shell/AppShell.jsx";
import Notifications from "./components/Notifications.jsx";

export const metadata = { title: "Notifications · AssetGuard" };

export default function NotificationsPage() {
  return (
    <AppShell active="notifications">
      <Notifications />
    </AppShell>
  );
}
