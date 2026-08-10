// app/mainapp/sites/add/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import AddSite from "../components/AddSite.jsx";

export const metadata = { title: "Add site · AssetGuard" };

export default function AddSitePage() {
  return (
    <AppShell active="add_site">
      <AddSite />
    </AppShell>
  );
}
