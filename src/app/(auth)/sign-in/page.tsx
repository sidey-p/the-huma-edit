import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";
import SignInInner from "./SignInInner";

export default function SignInPage() {
  return (
    <PublicShell>
      <SignInInner />
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
