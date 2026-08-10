// app/mainapp/response/page.jsx
import AppShell from "../shell/AppShell.jsx";
import ResponseTeams from "./components/ResponseTeams.jsx";

export const metadata = { title: "Response teams · AssetGuard" };

export default function ResponseTeamsPage() {
  return (
    <AppShell active="response">
      <ResponseTeams />
    </AppShell>
  );
}
