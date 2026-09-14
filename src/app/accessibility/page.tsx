import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";

/** Accessibility statement (§22 - WCAG 2.2 AA target). */
export default function AccessibilityPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">Everyone reads here</p>
        <h1 className="display-xl mt-2">Accessibility</h1>
        <div className="article-body mt-12">
          <p>
            The Human Edit targets WCAG 2.2 AA. Reading should be comfortable
            for everyone: the whole point of the place.
          </p>
          <h2>What we do</h2>
          <p>
            Full keyboard navigation. Visible focus. Semantic article
            structure for screen readers. Reading themes (light, dark, warm),
            adjustable text size, and reduced-motion support everywhere.
            Alternative text on every meaningful image.
          </p>
          <h2>When we fall short</h2>
          <p>
            Tell us. Accessibility gaps are treated as bugs, and bugs get
            fixed. A human reads every report.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Accessibility",
};
