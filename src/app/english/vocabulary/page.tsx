import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import {
  PronounceButton,
  SaveWordButton,
} from "@/components/vocabulary/WordControls";
import { fetchVocabulary, fetchWordOfDay } from "@/lib/content";

/**
 * §18 English Corner : vocabulary cards. No textbook feeling (18.4).
 * Word of the day (deterministic), pronunciation playback, save-to-list.
 */

const DIFFICULTY: { pattern: RegExp; label: string }[] = [
  { pattern: /serendipity|petrichor|ineffable|apricity/i, label: "rare" },
  { pattern: /equivocate|perfunctory|salience/i, label: "advanced" },
];

function difficultyFor(word: string): string {
  for (const d of DIFFICULTY) {
    if (d.pattern.test(word)) return d.label;
  }
  return "everyday";
}

export default async function VocabularyPage() {
  const [words, wordOfDay] = await Promise.all([
    fetchVocabulary(),
    fetchWordOfDay(),
  ]);

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">The English Corner</p>
        <h1 className="display-xl mt-2">Words to notice</h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">
          How English actually lives inside writing and conversation.
        </p>

        {/* Word of the day : same word for everyone each day */}
        {wordOfDay && (
          <section
            aria-labelledby="wotd-heading"
            className="mt-12 border border-line bg-paper-raised p-6"
            style={{ position: "relative" }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 22,
                height: 22,
                background:
                  "linear-gradient(135deg, transparent 50%, var(--gold-soft) 50%)",
              }}
            />
            <p className="meta-line" style={{ color: "var(--gold)" }}>
              Word of the day
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3">
              <h2 id="wotd-heading" className="font-display text-3xl">
                {wordOfDay.word}
              </h2>
              {wordOfDay.pronunciation && (
                <span className="meta-line">{wordOfDay.pronunciation}</span>
              )}
              <PronounceButton word={wordOfDay.word} />
            </div>
            <p className="mt-3 text-lg">{wordOfDay.plainMeaning}</p>
            {wordOfDay.usageExample && (
              <p className="mt-3 font-display text-lg italic text-ink-muted">
                “{wordOfDay.usageExample}”
              </p>
            )}
            <div className="mt-4">
              <SaveWordButton wordId={wordOfDay._id} />
            </div>
          </section>
        )}

        <div className="mt-16 space-y-14">
          {words.map((w) => (
            <article key={w._id} className="border-t border-line pt-8">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <h2 className="font-display text-3xl">{w.word}</h2>
                {w.pronunciation && (
                  <span className="meta-line">{w.pronunciation}</span>
                )}
                {w.partOfSpeech && (
                  <span className="meta-line italic">{w.partOfSpeech}</span>
                )}
                <span
                  className="meta-line"
                  style={{
                    color:
                      difficultyFor(w.word) === "rare"
                        ? "var(--gold)"
                       : "var(--ink-faint)",
                  }}
                >
                  · {difficultyFor(w.word)}
                </span>
                <PronounceButton word={w.word} />
                <SaveWordButton wordId={w._id} />
              </div>
              <p className="mt-4 text-lg">{w.plainMeaning}</p>
              {w.usageExample && (
                <p className="mt-3 font-display text-lg italic text-ink-muted">
                  “{w.usageExample}”
                </p>
              )}
              {w.etymology && (
                <p className="meta-line mt-4">
                  <span className="text-ink-faint">Origin - </span>
                  {w.etymology}
                </p>
              )}
              {w.commonMistakes && (
                <p className="meta-line mt-2">
                  <span className="text-ink-faint">Common mistake - </span>
                  {w.commonMistakes}
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
                  Nearby:{" "}
                  {w.relatedWords.map((rw, i) => (
                    <span key={rw}>
                      {i > 0 && " · "}
                      <Link
                        href={`/search?q=${encodeURIComponent(rw)}`}
                        className="ink-link"
                      >
                        {rw}
                      </Link>
                    </span>
                  ))}
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
  description: "Vocabulary from The English Corner: words worth keeping.",
};
