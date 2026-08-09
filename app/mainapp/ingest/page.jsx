// app/mainapp/ingest/page.jsx
import AppShell from "../shell/AppShell.jsx";
import IngestPanel from "./components/IngestPanel.jsx";

export const metadata = { title: "Live logs · AssetGuard" };

export default function IngestPage() {
  return (
    <AppShell active="ingest">
      <IngestPanel />
    </AppShell>
  );
}
