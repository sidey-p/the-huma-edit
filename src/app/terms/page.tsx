import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";

/** Terms. */
export default function TermsPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">The agreement</p>
        <h1 className="display-xl mt-2">Terms</h1>
        <div className="article-body mt-12">
          <h2>The writing</h2>
          <p>
            Pieces published here belong to their authors and to The Human
            Edit. Quote us generously, attribute us honestly.
          </p>
          <h2>The reading</h2>
          <p>
            Your account is yours. Your library is yours. Keep it courteous:
            one account per human, and that human is you.
          </p>
          <h2>The platform</h2>
          <p>
            We improve things, sometimes break things, and always fix the
            breaks. The service is provided as-is, with the care of a small
            editorial team behind it.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Terms",
};
