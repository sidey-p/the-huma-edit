import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicShell } from "@/components/navigation/PublicShell";
import { ContinueBanner } from "@/components/reader/ContinueBanner";
import { formatDate } from "@/lib/format";
import {
  fetchHomeFeed,
  fetchCorners,
  fetchCornerFeatures,
} from "@/lib/content";

type SectionCfg = { type: string; visible?: boolean };

/** §15: sections order/visibility from the admin composer, with sane defaults. */
async function homepageSections(): Promise<SectionCfg[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("homepage_config")
      .select("sections")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    const sections = (data?.sections as SectionCfg[] | null) ?? [];
    if (sections.length > 0) return sections.filter((s) => s.visible !== false);
  } catch {}
  return [
    { type: "hero" },
    { type: "edit" },
    { type: "corners" },
    { type: "new-writing" },
  ];
}

/** §06 Homepage: splash, hero, The Edit, corners (fold motif), new writing. */
export default async function HomePage() {
  const [feed, cornerFeatures, corners, sections] = await Promise.all([
    fetchHomeFeed(12),
    fetchCornerFeatures(),
    fetchCorners(),
    homepageSections(),
  ]);

  const [theEdit, ...latest] = feed;
  // §06 hero side: the three highlighted pieces, one per featured corner
  // (matches the editorial highlights, not just the newest three).
  const heroCornerSlugs = ["growth", "human", "help"];
  const tickets = heroCornerSlugs
    .map((slug) => {
      const f = cornerFeatures[slug];
      if (!f) return null;
      const corner = corners.find((c) => c.slug === slug);
      return {
        id: `${slug}-${f.slug}`,
        slug: f.slug,
        title: f.title,
        cornerName: corner?.name ?? slug,
      };
    })
    .filter(Boolean) as Array<{ id: string; slug: string; title: string; cornerName: string }>;
  const fallbackTickets = feed.slice(0, 3);
  const finalTickets = tickets.length > 0 ? tickets : fallbackTickets;
  const sideStories = latest.slice(0, 2);

  const heroSection = (
    <section className="hero wrap" key="hero">
      <ContinueBanner />
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
            Stories, ideas, language, perspectives, and useful things:
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
          {finalTickets.map((t) => (
            <Link
              key={t.id}
              href={`/articles/${t.slug}`}
              className="ticket pressable"
            >
              <div className="corner">{t.cornerName}</div>
              <p>{t.title}</p>
              <span className="ticket-cta" aria-hidden="true">
                Read this piece →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );

  const editSection = theEdit ? (
    <section className="section wrap" id="the-edit" key="edit">
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
            <span>
              {theEdit.published_at
                ? formatDate(new Date(theEdit.published_at).getTime())
               : ""}
            </span>
          </div>
          <h3>{theEdit.title}</h3>
          {theEdit.dek && <p className="dek">{theEdit.dek}</p>}
          {theEdit.author && (
            <div className="byline">By {theEdit.author.displayName}</div>
          )}
        </Link>

        <ul className="side-list" data-stagger>
          {sideStories.map((a) => (
            <li key={a.id}>
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
  ) : null;

  const cornersSection = (
    <section className="section wrap" id="corners" key="corners">
      <div className="section-head reveal">
        <div>
          <h2>Corners</h2>
          <p>Six rooms in the same house. Pick the one that fits your mood.</p>
        </div>
        <Link className="ink-link" href="/corners">
          All corners
        </Link>
      </div>

      <div className="corners-rail" data-stagger>
        {corners.map((corner, i) => {
          const featured = cornerFeatures[corner.slug];
          return (
            <div key={corner._id} className="corner-card pressable">
              <Link
                href={`/corners/${corner.slug}`}
                className="corner-card-main"
                aria-label={`${corner.name} corner`}
              >
                <div className="cnum">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3>{corner.name}</h3>
                {corner.description && <p>{corner.description}</p>}
              </Link>
              {featured && (
                <Link
                  href={`/articles/${featured.slug}`}
                  className="read-link"
                  title={featured.title}
                >
                  Read: {featured.title}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );

  const writingSection = (
    <section className="section wrap" id="new-writing" key="new-writing">
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
          <li key={a.id}>
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
                {a.published_at
                  ? formatDate(new Date(a.published_at).getTime())
                 : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );

  const pathsSection = (
    <section className="section wrap" id="paths" key="paths">
      <div className="section-head reveal">
        <div>
          <h2>Reading Paths</h2>
          <p>Guided journeys through the archive.</p>
        </div>
        <Link className="ink-link" href="/paths">
          All paths
        </Link>
      </div>
    </section>
  );

  const vocabularySection = (
    <section className="section wrap" id="word-of-the-day" key="vocabulary">
      <div className="section-head reveal">
        <div>
          <h2>Word of the day</h2>
          <p>A word worth keeping, every day.</p>
        </div>
        <Link className="ink-link" href="/english/vocabulary">
          The vocabulary shelf
        </Link>
      </div>
    </section>
  );

  const SECTIONS: Record<string, React.ReactNode> = {
    hero: heroSection,
    edit: editSection,
    corners: cornersSection,
    "new-writing": writingSection,
    paths: pathsSection,
    vocabulary: vocabularySection,
  };

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
      {sections
        .map((s) => SECTIONS[s.type])
        .filter(Boolean)
        .map((section, i, arr) => (
          <div key={i}>
            {section}
            {i < arr.length - 1 && <hr className="rule wrap" />}
          </div>
        ))}
    </PublicShell>
  );
}
