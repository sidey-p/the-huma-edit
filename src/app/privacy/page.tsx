import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";

/** Privacy (§38). */
export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">Boring, on purpose</p>
        <h1 className="display-xl mt-2">Privacy</h1>
        <div className="article-body mt-12">
          <h2>What we collect</h2>
          <p>
            If you create an account: your email, and whatever reading
            behavior makes the product better for you — saves, highlights,
            progress. If you read anonymously: nothing tied to you.
          </p>
          <h2>What we never do</h2>
          <p>
            Sell data. Expose reading history. Build sensitive psychological
            profiles for targeting. Personalization here exists to help you
            find your next piece — not to package you.
          </p>
          <h2>Your control</h2>
          <p>
            You can manage your account and privacy settings, and request
            export or deletion of your data. Email us and a human will handle
            it.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Privacy",
};
