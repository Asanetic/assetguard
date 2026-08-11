// app/mainapp/ports/raw/page.jsx
import AppShell from "../../shell/AppShell.jsx";
import RawPortData from "./components/RawPortData.jsx";

export const metadata = { title: "Raw port data · AssetGuard" };

export default function RawPortDataPage() {
  return (
    <AppShell active="ports">
      <RawPortData />
    </AppShell>
  );
}
