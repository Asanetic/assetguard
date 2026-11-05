// app/mainapp/admin/installation/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import InstallationControl from "./components/InstallationControl.jsx";

export const metadata = { title: "Installation · AssetGuard" };

export default function InstallationPage() {
  return (
    <AppShell active="installation">
      <InstallationControl />
    </AppShell>
  );
}
