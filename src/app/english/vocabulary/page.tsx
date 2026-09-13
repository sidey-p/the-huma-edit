import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/** §18 English Corner — vocabulary cards. No textbook feeling (18.4). */
export default async function VocabularyPage() {
  const words = await fetchQuery(api.vocabulary.listVocabulary, {});

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">The English Corner</p>
        <h1 className="display-xl mt-2">Words to notice</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">
          How English actually lives inside writing and conversation.
        </p>
        <div className="mt-16 space-y-14">
          {words.map((w) => (
            <article key={w._id} className="border-t border-line pt-8">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="font-display text-3xl">{w.word}</h2>
                {w.pronunciation && (
                  <span className="meta-line">{w.pronunciation}</span>
                )}
                {w.partOfSpeech && (
                  <span className="meta-line italic">{w.partOfSpeech}</span>
                )}
              </div>
              <p className="mt-4 text-lg">{w.plainMeaning}</p>
              {w.usageExample && (
                <p className="mt-3 font-display text-lg italic text-ink-muted">
                  “{w.usageExample}”
                </p>
              )}
              {w.etymology && (
                <p className="meta-line mt-4">
                  <span className="text-ink-faint">Origin — </span>
                  {w.etymology}
                </p>
              )}
              {w.conversationExamples && w.conversationExamples.length > 0 && (
                <div className="mt-5">
                  <p className="meta-line font-medium">In conversation</p>
                  <ul className="mt-2 space-y-1">
                    {w.conversationExamples.map((c, i) => (
                      <li key={i} className="text-sm text-ink-muted">
                        “{c}”
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {w.relatedWords && w.relatedWords.length > 0 && (
                <p className="meta-line mt-5">
                  Nearby: {w.relatedWords.join(" · ")}
                </p>
              )}
            </article>
          ))}
        </div>
        {words.length === 0 && (
          <p className="mt-16 text-ink-muted">
            The word collection is still growing.
          </p>
        )}
        <p className="mt-16">
          <Link href="/corners/english" className="text-accent underline">
            More from the English Corner
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Words to notice",
  description: "Vocabulary from The English Corner — words worth keeping.",
};
