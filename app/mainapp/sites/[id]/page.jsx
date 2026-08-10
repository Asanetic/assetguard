// app/mainapp/sites/[id]/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import ViewSite from "./components/ViewSite.jsx";

export const metadata = { title: "Site · AssetGuard" };

export default async function ViewSitePage({ params }) {
  const { id } = await params; // Next.js 15+: params is async
  return (
    <AppShell active="all_sites">
      <ViewSite id={id} />
    </AppShell>
  );
}
