import AuthShell from "../AssetGuard/Authshell";
import LoginForm from "../AssetGuard/Loginform";
import RegisterForm from "../AssetGuard/RegisterForm";

export const metadata = { title: "Log in — AssetGuard" };

export default function LoginPage() {
  return (
    <AuthShell width={440} title="Create user account" subtitle="Register account">
      <RegisterForm />
    </AuthShell>
  );
}