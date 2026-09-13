import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";

/** §30 Human authorship policy. */
export default function HumanAuthorshipPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">Our promise</p>
        <h1 className="display-xl mt-2">Human authorship</h1>
        <div className="article-body mt-12">
          <p>
            Every piece published in The Human Edit carries a human
            author&apos;s name. That is not a marketing claim. It is the
            foundation this publication is built on.
          </p>
          <h2>What we commit to</h2>
          <p>
            Every article is written by a person. Editors are people too: they
            shape, question, correct, and approve what we publish. Provenance —
            who wrote a piece, when it was first published, and what changed —
            stays visible on every page.
          </p>
          <h2>What we don&apos;t do</h2>
          <p>
            We do not publish machine-generated prose as editorial content. We
            do not quietly rewrite history: significant corrections are
            labelled as corrections. And we do not treat readers as engagement
            metrics to be farmed.
          </p>
          <h2>Assistive tools</h2>
          <p>
            Our editors may use software to catch typos, check links, suggest
            metadata, or summarise analytics. Suggest is the operative word:
            a human decides what gets published, every single time.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Human authorship",
  description: "How content is created at The Human Edit — by humans.",
};
