// app/mainapp/tcplogs/page.jsx
import AppShell from "../shell/AppShell.jsx";
import TcpLogs from "./components/TcpLogs.jsx";

export const metadata = { title: "TCP logs · AssetGuard" };

export default function TcpLogsPage() {
  return (
    <AppShell active="tcplogs">
      <TcpLogs />
    </AppShell>
  );
}
