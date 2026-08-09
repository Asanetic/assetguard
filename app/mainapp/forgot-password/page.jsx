// app/mainapp/forgot-password/page.jsx
import AuthShell from "../authui/AuthShell.jsx";
import ForgotPasswordForm from "./ForgotPasswordForm.jsx";

export const metadata = { title: "Reset password · AssetGuard" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
