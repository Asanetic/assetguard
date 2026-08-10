// app/mainapp/noc/page.jsx
import AppShell from "../shell/AppShell.jsx";
import NocTeams from "./components/NocTeams.jsx";

export const metadata = { title: "NOC teams · AssetGuard" };

export default function NocTeamsPage() {
  return (
    <AppShell active="noc">
      <NocTeams />
    </AppShell>
  );
}
