// app/mainapp/profile/page.jsx
import AppShell from "../shell/AppShell.jsx";
import Profile from "./components/Profile.jsx";

export const metadata = { title: "My profile · AssetGuard" };

export default function ProfilePage() {
  return (
    <AppShell active="profile">
      <Profile />
    </AppShell>
  );
}
