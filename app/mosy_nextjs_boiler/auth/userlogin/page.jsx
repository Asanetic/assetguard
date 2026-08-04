import AuthShell from "../AssetGuard/Authshell";
import LoginForm from "../AssetGuard/Loginform";

export const metadata = { title: "Log in — AssetGuard" };

export default function LoginPage() {
  return (
    <AuthShell width={440} title="Welcome back" subtitle="Log in to your AssetGuard account">
      <LoginForm />
    </AuthShell>
  );
}