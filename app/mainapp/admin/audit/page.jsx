// app/mainapp/admin/audit/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import AuditLogs from "./components/AuditLogs.jsx";

export const metadata = { title: "Audit logs · AssetGuard" };

export default function AuditLogsPage() {
  return (
    <AppShell active="audit">
      <AuditLogs />
    </AppShell>
  );
}
