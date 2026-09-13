import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";
import { SearchExperience } from "@/components/search/SearchExperience";

/** §08 Explore Search page. */
export default function SearchPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="display-lg">
            Tell us what you&apos;re looking for.
          </h1>
          <p className="mt-4 text-lg text-ink-muted">
            We&apos;ll help you find something worth reading.
          </p>
        </div>
        <div className="mt-12">
          <SearchExperience />
        </div>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Search",
  description:
    "Tell us what you're looking for. We'll help you find something worth reading.",
};
