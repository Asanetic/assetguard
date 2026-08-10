// app/mainapp/admin/access/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import AccessControl from "./components/AccessControl.jsx";

export const metadata = { title: "Access Control · AssetGuard" };

export default function AccessControlPage() {
  return (
    <AppShell active="access">
      <AccessControl />
    </AppShell>
  );
}
