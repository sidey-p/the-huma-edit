import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";
import { DeskHome } from "@/components/studio/DeskHome";

/** Desk (§12.2) - the Studio's editorial home. */
export default function StudioPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-6">
        <p className="meta-line">Edit Studio</p>
        <h1 className="display-lg mt-2">The Desk</h1>
        <div className="mt-12">
          <DeskHome />
        </div>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "The Desk",
  robots: { index: false, follow: false },
};
