// app/mainapp/registration-rejected/page.jsx
import AuthShell from "../authui/AuthShell.jsx";
import RejectedView from "./RejectedView.jsx";

export const metadata = { title: "Registration not approved · AssetGuard" };

export default function RegistrationRejectedPage() {
  return (
    <AuthShell>
      <RejectedView />
    </AuthShell>
  );
}
