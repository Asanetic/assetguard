// app/mainapp/sites/page.jsx
import AppShell from "../shell/AppShell.jsx";
import AllSites from "./components/AllSites.jsx";

export const metadata = { title: "All sites · AssetGuard" };

export default function SitesPage() {
  return (
    <AppShell active="all_sites">
      <AllSites />
    </AppShell>
  );
}
