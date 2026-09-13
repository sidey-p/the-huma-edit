import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { formatDate } from "@/lib/format";

type FeedArticle = Awaited<
  ReturnType<typeof fetchQuery<typeof api.articles.listHomeFeed>>
>[number];

/** §06 Homepage: splash, hero, The Edit, corners (fold motif), new writing. */
export default async function HomePage() {
  const [feed, cornerFeatures, corners] = await Promise.all([
    fetchQuery(api.articles.listHomeFeed, { limit: 12 }),
    fetchQuery(api.articles.listCornerFeatures, {}),
    fetchQuery(api.taxonomy.listCorners, {}),
  ]);

  const [theEdit, ...latest] = feed;
  const tickets = feed.slice(0, 3);
  const sideStories = latest.slice(0, 2);

  // §29 SEO: publication + sitewide search structured data.
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "The Human Edit",
    description:
      "Stories, ideas, language, perspectives, and useful things worth reading.",
    potentialAction: {
      "@type": "SearchAction",
      target: "/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      {/* Hero */}
      <section className="hero wrap">
        <div className="hero-grid">
          <div>
            <div className="hero-eyebrow">
              <span className="dot" />
              <span className="eyebrow">New writing every weekday</span>
            </div>
            <h1>
              <span className="line">
                <span style={{ animationDelay: "1000ms" }}>Read something</span>
              </span>
              <span className="line">
                <span style={{ animationDelay: "1080ms" }}>worth your</span>
              </span>
              <span className="line">
                <span style={{ animationDelay: "1160ms" }}>time.</span>
              </span>
            </h1>
            <p className="lede">
              Stories, ideas, language, perspectives, and useful things —
              written by people, edited by people, for people.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-primary" href="/search">
                Explore what you&apos;re looking for
              </Link>
              <Link className="btn btn-ghost" href="/corners">
                Browse the corners
              </Link>
            </div>
          </div>

          <div className="hero-side" aria-label="Featured picks">
            {tickets.map((t) => (
              <div key={t._id} className="ticket">
                <div className="corner">{t.cornerName}</div>
                <p>{t.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="rule wrap" />

      {/* The Edit */}
      {theEdit && (
        <section className="section wrap" id="the-edit">
          <div className="section-head reveal">
            <div>
              <h2>The Edit</h2>
              <p>Chosen, not just new.</p>
            </div>
          </div>

          <div className="edit-grid">
            <Link
              href={`/articles/${theEdit.slug}`}
              className="feature-story reveal"
            >
              <div className="eyebrow">
                <span>{theEdit.cornerName}</span> ·{" "}
                <span>{formatDate(theEdit.publishedAt)}</span>
              </div>
              <h3>{theEdit.title}</h3>
              {theEdit.dek && <p className="dek">{theEdit.dek}</p>}
              {theEdit.author && (
                <div className="byline">By {theEdit.author.displayName}</div>
              )}
            </Link>

            <ul className="side-list" data-stagger>
              {sideStories.map((a) => (
                <li key={a._id}>
                  <Link href={`/articles/${a.slug}`}>
                    <span className="corner-tag">
                      {(a.cornerName ?? "").toUpperCase()}
                    </span>
                    <h4>{a.title}</h4>
                    {a.dek && <p>{a.dek}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <hr className="rule wrap" />

      {/* Corners — literal folded-corner cards */}
      <section className="section wrap" id="corners">
        <div className="section-head reveal">
          <div>
            <h2>Corners</h2>
            <p>Six rooms in the same house — pick the one that fits your mood.</p>
          </div>
          <Link className="ink-link" href="/corners">
            All corners
          </Link>
        </div>

        <div className="corners-rail" data-stagger>
          {corners.map((corner, i) => {
            const featured = cornerFeatures[corner.slug];
            return (
              <article key={corner._id} className="corner-card">
                <div className="cnum">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3>{corner.name}</h3>
                {corner.description && <p>{corner.description}</p>}
                {featured && (
                  <Link
                    className="read-link ink-link"
                    href={`/articles/${featured.slug}`}
                  >
                    Read: {featured.title}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <hr className="rule wrap" />

      {/* New writing — newspaper list */}
      <section className="section wrap" id="new-writing">
        <div className="section-head reveal">
          <div>
            <h2>New writing</h2>
            <p>The most recent pieces, in order.</p>
          </div>
          <Link className="ink-link" href="/archive">
            Visit the archive
          </Link>
        </div>

        <ul className="writing-list" data-stagger>
          {latest.slice(2).map((a) => (
            <li key={a._id}>
              <Link className="writing-row" href={`/articles/${a.slug}`}>
                <span className="corner-tag">
                  {(a.cornerName ?? "").toUpperCase()}
                </span>
                <span>
                  <h4>{a.title}</h4>
                  {a.dek && <p>{a.dek}</p>}
                </span>
                <span className="meta">
                  {a.author?.displayName} ·{" "}
                  {formatDate(a.publishedAt).replace(/ 20\d\d$/, "").replace(
                    /^(January|February|March|April|May|June|July|August|September|October|November|December) (\d+)$/,
                    "$1 $2"
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PublicShell>
  );
}
