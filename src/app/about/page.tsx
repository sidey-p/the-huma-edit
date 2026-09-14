import type { Metadata } from "next";
import { PublicShell } from "@/components/navigation/PublicShell";

/** About page. */
export default function AboutPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line">The publication</p>
        <h1 className="display-xl mt-2">About The Human Edit</h1>
        <div className="article-body mt-12">
          <p>
            The Human Edit is a modern digital publication built around one
            act: reading. Stories, ideas, language, perspectives, and useful
            things: written by humans, for humans.
          </p>
          <blockquote>
            BY HUMANS. FOR HUMANS.
          </blockquote>
          <h2>Why a reading publication</h2>
          <p>
            Most of the internet is built to keep you scrolling. This place is
            built to have you leave with something: something you read,
            learned, felt, or thought about. Search here retrieves good
            writing; it never answers in place of the piece.
          </p>
          <h2>The corners</h2>
          <p>
            Six worlds: Story, English, Growth, Thought, Help, and Human. Each
            is a place to wander, not a dropdown to filter by.
          </p>
          <h2>Who makes it</h2>
          <p>
            A small editorial desk. Writers with names, editors with
            standards, and a quiet reading room with the click of a door.
          </p>
        </div>
      </article>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "About",
  description: "The Human Edit: a place people go to read.",
};
