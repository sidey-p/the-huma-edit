import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";
import LibraryInner from "./LibraryInner";

/** §4.2 Library - the reader's personal shelf. */
export default function LibraryPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-6">
        <p className="meta-line">Yours</p>
        <h1 className="display-lg mt-2">Library</h1>
        <div className="mt-12">
          <LibraryInner />
        </div>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Library",
  robots: { index: false, follow: false },
};
