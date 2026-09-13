import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/** §11 Authors index — the people behind the words. */
export default async function AuthorsPage() {
  const authors = await fetchQuery(api.authors.listAuthors, {});

  return (
    <PublicShell>
      <div className="wrap" style={{ paddingBottom: "clamp(3rem, 6vw, 5rem)" }}>
        <div className="section-head" style={{ paddingTop: "clamp(3rem, 6vw, 5rem)", marginBottom: "1rem" }}>
          <div>
            <h1 className="display-lg">Authors</h1>
            <p className="mt-2 text-ink-muted">
              Every piece on this site is written by a person. These are the
              people.
            </p>
          </div>
        </div>

        <ul className="writing-list">
          {authors.map((author) => (
            <li key={author._id}>
              <Link className="writing-row" href={`/authors/${author.slug}`}>
                <span className="corner-tag">AUTHOR</span>
                <span>
                  <h4>{author.displayName}</h4>
                  {author.shortBio && <p>{author.shortBio}</p>}
                </span>
                <span className="meta">{author.displayName}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Authors",
  description: "The people who write for The Human Edit.",
};
