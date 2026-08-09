// app/mainapp/admin/users/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import UsersAdmin from "./components/UsersAdmin.jsx";

export const metadata = { title: "Users & Roles · AssetGuard" };

export default function UsersAdminPage() {
  return (
    <AppShell active="users">
      <UsersAdmin />
    </AppShell>
  );
}
