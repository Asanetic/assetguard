// app/mainapp/alarms/[id]/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import AlarmDetail from "./components/AlarmDetail.jsx";

export const metadata = { title: "Alarm · AssetGuard" };

export default function AlarmDetailPage({ params }) {
  return (
    <AppShell active="alarms">
      <AlarmDetail id={params.id} />
    </AppShell>
  );
}
