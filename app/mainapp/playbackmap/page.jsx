// app/mainapp/playbackmap/page.jsx
import { Suspense } from "react";
import AppShell from "../shell/AppShell.jsx";
import PlaybackMap from "./components/PlaybackMap.jsx";

export const metadata = { title: "Route Playback · AssetGuard" };

export default function PlaybackMapPage() {
  return (
    <AppShell active="playback">
      <Suspense fallback={null}>
        <PlaybackMap />
      </Suspense>
    </AppShell>
  );
}
