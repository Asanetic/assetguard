// app/mainapp/status/page.jsx
// Pending-approval / status screen. Route: /mainapp/status
import AuthShell from "../authui/AuthShell.jsx";
import StatusView from "./StatusView.jsx";

export const metadata = { title: "Account status · AssetGuard" };

export default function StatusPage() {
  return (
    <AuthShell>
      <StatusView />
    </AuthShell>
  );
}
