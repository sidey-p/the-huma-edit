import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";
import { SettingsInner, SignedOutNote } from "./SettingsInner";

/** §4.2 Settings : account, appearance, privacy. */
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

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};
