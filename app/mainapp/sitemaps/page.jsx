// app/mainapp/sitemaps/page.jsx
import AppShell from "../shell/AppShell.jsx";
import SitesMap from "./components/SitesMap.jsx";

export const metadata = { title: "Sites map · AssetGuard" };

export default function SitesMapPage() {
  return (
    <AppShell active="sites">
      <SitesMap />
    </AppShell>
  );
}
