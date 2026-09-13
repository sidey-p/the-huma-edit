import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";

/** Editorial policy (§30.3). */
export default function EditorialPolicyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">The rules we hold ourselves to</p>
        <h1 className="display-xl mt-2">Editorial policy</h1>
        <div className="article-body mt-12">
          <h2>How pieces are made</h2>
          <p>
            Writing moves through an explicit workflow: draft, review,
            approval, publication. Nothing reaches you without a human editor
            choosing to send it.
          </p>
          <h2>Sourcing and credit</h2>
          <p>
            When we use sources, we cite them. When we use images, we credit
            them. When a piece draws on someone&apos;s research or lived
            experience, we say so.
          </p>
          <h2>Corrections</h2>
          <p>
            Errors happen; hiding them doesn&apos;t fix them. Factual changes
            to published pieces are noted on the page, with the date. We
            don&apos;t silently overwrite the record.
          </p>
          <h2>Independence</h2>
          <p>
            No sponsored content dressed as editorial. No affiliate links
            hidden in prose. If we ever accept support, it will be labelled
            plainly.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Editorial policy",
  description: "How The Human Edit creates, sources, and corrects its work.",
};
