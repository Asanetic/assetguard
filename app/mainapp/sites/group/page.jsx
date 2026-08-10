// app/mainapp/sites/group/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import GroupSites from "./components/GroupSites.jsx";

export const metadata = { title: "Group sites · AssetGuard" };

export default function GroupSitesPage() {
  return (
    <AppShell active="group_sites">
      <GroupSites />
    </AppShell>
  );
}
