// app/mainapp/ports/parse-errors/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import ParseErrors from "./components/ParseErrors.jsx";

export const metadata = { title: "Parse errors · AssetGuard" };

export default function ParseErrorsPage() {
  return (
    <AppShell active="ports">
      <ParseErrors />
    </AppShell>
  );
}
