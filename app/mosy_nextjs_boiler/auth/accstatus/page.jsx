import { Suspense } from "react";
import AuthShell from "../AssetGuard/Authshell";
import PendingApproval from "../AssetGuard/Pendingapproval";

export const metadata = { title: "Check account status — AssetGuard" };

export default function LoginPage() {
  return (
    <AuthShell width={440} title="Registration status" subtitle="Check the status of your account">
      <Suspense fallback={null}>
        <PendingApproval />
      </Suspense>
    </AuthShell>
  );
}