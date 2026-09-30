// app/mainapp/responseplayback/page.jsx
import { Suspense } from "react";
import AppShell from "../shell/AppShell.jsx";
import ResponsePlaybackMap from "./components/ResponsePlaybackMap.jsx";

export const metadata = { title: "Response Playback · AssetGuard" };

export default function ResponsePlaybackPage() {
  return (
    <AppShell active="playback">
      <Suspense fallback={null}>
        <ResponsePlaybackMap />
      </Suspense>
    </AppShell>
  );
}
