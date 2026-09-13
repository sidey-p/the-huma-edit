import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { SettingsInner } from "./SettingsInner";

/** §4.2 Settings — account, appearance, privacy. */
export default function SettingsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-6">
        <p className="meta-line">Yours</p>
        <h1 className="display-lg mt-2">Settings</h1>
        <div className="mt-12">
          <SettingsInner />
          <div className="mt-8">
            <SignedOutNote />
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

/** Quiet sign-in prompt for signed-out readers — no forced signup (§1.3). */
function SignedOutNote() {
  return (
    <p className="meta-line">
      <Link href="/sign-in" className="ink-link">
        Sign in
      </Link>{" "}
      to manage your account, library, and reading preferences.
    </p>
  );
}

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};
