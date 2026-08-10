// app/mainapp/track/page.jsx
import { Suspense } from "react";
import AppShell from "../shell/AppShell.jsx";
import TrackDevice from "./components/TrackDevice.jsx";

export const metadata = { title: "Track device · AssetGuard" };

export default function TrackDevicePage() {
  return (
    <AppShell active="devices" speakerPosition="left">
      <Suspense fallback={null}>
        <TrackDevice />
      </Suspense>
    </AppShell>
  );
}
