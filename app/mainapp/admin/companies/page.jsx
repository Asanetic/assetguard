// app/mainapp/admin/companies/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import CompaniesAdmin from "./components/CompaniesAdmin.jsx";

export const metadata = { title: "Companies · AssetGuard" };

export default function CompaniesAdminPage() {
  return (
    <AppShell active="companies">
      <CompaniesAdmin />
    </AppShell>
  );
}
