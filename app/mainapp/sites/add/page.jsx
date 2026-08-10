// app/mainapp/sites/add/page.jsx
import { Suspense } from "react";
import AppShell from "../../shell/AppShell.jsx";
import AddSite from "../components/AddSite.jsx";

export const metadata = { title: "Add site · AssetGuard" };

export default function AddSitePage() {
  return (
    <AppShell active="add_site">
      <Suspense fallback={null}>
        <AddSite />
      </Suspense>
    </AppShell>
  );
}
