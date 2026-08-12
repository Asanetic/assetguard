// app/mainapp/alarmconfig/page.jsx
import AppShell from "../shell/AppShell.jsx";
import AlarmConfig from "./components/AlarmConfig.jsx";

export const metadata = { title: "Alarm thresholds · AssetGuard" };

export default function AlarmConfigPage() {
  return (
    <AppShell active="alarmconfig">
      <AlarmConfig />
    </AppShell>
  );
}
