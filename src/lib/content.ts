import { createClient } from "@/lib/supabase/server";

/**
 * Server-side data access (§25 server-first).
 * All reader-facing pages fetch via the server client with RLS.
 * NOTE: Supabase nested-select typing is loose; rows are cast explicitly.
 */

export interface FeedArticle {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  reading_time_seconds: number;
  published_at: string | null;
  content_type: string | null;
  cornerName: string | null;
  cornerSlug: string | null;
  author: { displayName: string; slug: string } | null;
}

type AnyRow = Record<string, any>;

const num = (v: unknown, d = 0): number =>
  typeof v === "number" ? v : Number(v ?? d) || d;
const str = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

/** Home feed: published, newest first, with corner + author (§06). */
export async function fetchHomeFeed(limit = 12): Promise<FeedArticle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      `id, slug, title, dek, reading_time_seconds, published_at, content_type,
       article_corners ( corners ( slug, name ) ),
       authors ( slug, display_name )`,
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as AnyRow[]).map(mapFeedRow);
}

function mapFeedRow(r: AnyRow): FeedArticle {
  const corner = r.article_corners?.[0]?.corners ?? null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    dek: str(r.dek),
    reading_time_seconds: num(r.reading_time_seconds),
    published_at: str(r.published_at),
    content_type: str(r.content_type),
    cornerName: corner?.name ?? null,
    cornerSlug: corner?.slug ?? null,
    author: r.authors
      ? { displayName: r.authors.display_name, slug: r.authors.slug }
     : null,
  };
}

/** Published articles (optionally filtered by corner) : cards only (§4.1). */
export async function fetchPublished(
  opts: { cornerSlug?: string; limit?: number } = {},
) {
  const supabase = await createClient();

  // Resolve corner -> article ids via the join table (PostgREST cannot
  // inline SQL subqueries through .in(), which 500'd every corner page).
  let articleIds: string[] | null = null;
  if (opts.cornerSlug) {
    const { data: corner } = await supabase
      .from("corners")
      .select("id")
      .eq("slug", opts.cornerSlug)
      .maybeSingle();
    if (!corner) return [];
    const { data: joins } = await supabase
      .from("article_corners")
      .select("article_id")
      .eq("corner_id", corner.id);
    articleIds = ((joins ?? []) as unknown as AnyRow[]).map((j) => j.article_id);
    if (articleIds.length === 0) return [];
  }

  let q = supabase
    .from("articles")
    .select("id, slug, title, dek, reading_time_seconds, published_at, content_type")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (articleIds) q = q.in("id", articleIds);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as AnyRow[]).map((a) => ({
    _id: a.id,
    id: a.id,
    slug: a.slug,
    title: a.title,
    dek: str(a.dek),
    reading_time_seconds: num(a.reading_time_seconds),
    published_at: str(a.published_at),
    content_type: str(a.content_type),
  }));
}

export interface ArticleDetail {
  _id: string;
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  content_json: unknown;
  content_text?: string;
  status: string;
  content_type: string | null;
  reading_time_seconds: number;
  word_count: number;
  published_at: string | null;
  updated_at: string;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  human_authorship_attested: boolean;
  corners: Array<{ id: string; slug: string; name: string }>;
  author: { slug: string; displayName: string; isGhost: boolean } | null;
  topics: Array<{ id: string; slug: string; name: string }>;
  wordsToNotice: Array<{ _id: string; word: string; partOfSpeech: string | null; plainMeaning: string; pronunciation: string | null; usageExample: string | null }>;
  editorialLinks: Array<{ slug: string; title: string; dek: string | null; label: string | null }>;
  ads: Array<{
    id: string;
    placement: string;
    afterParagraph: number;
    title: string | null;
    body: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    kind: string;
  }>;
}

/** Full article by slug with corners, author, topics, words (§7). */
export async function fetchArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      `id, slug, title, dek, content_json, content_text, status, content_type,
       reading_time_seconds, word_count, published_at, updated_at,
       seo_title, seo_description, canonical_url, human_authorship_attested,
       authors ( slug, display_name, is_ghost ),
        article_corners ( corners ( id, slug, name ) ),
        article_topics ( topics ( id, slug, name ) )`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  const a = data as unknown as AnyRow;

  const [words, links, ads] = await Promise.all([
    supabase
      .from("vocabulary_words")
      .select("id, word, part_of_speech, plain_meaning, pronunciation, usage_example"),
    supabase
      .from("article_links")
      .select("label, position, to_article:articles!article_links_to_article_id_fkey ( slug, title, dek )")
      .eq("from_article_id", a.id)
      .order("position"),
    supabase
      .from("ad_slots")
      .select("*")
      .eq("article_id", a.id)
      .eq("is_active", true),
  ]);

  const linksData = (links.data ?? []) as unknown as AnyRow[];

  return {
    _id: a.id,
    id: a.id,
    slug: a.slug,
    title: a.title,
    dek: str(a.dek),
    content_json: a.content_json,
    content_text: a.content_text,
    status: a.status,
    content_type: str(a.content_type),
    reading_time_seconds: num(a.reading_time_seconds),
    word_count: num(a.word_count),
    published_at: str(a.published_at),
    updated_at: a.updated_at as string,
    seo_title: str(a.seo_title),
    seo_description: str(a.seo_description),
    canonical_url: str(a.canonical_url),
    human_authorship_attested: a.human_authorship_attested as boolean,
    corners: (a.article_corners ?? []).map((c: AnyRow) => c.corners).filter(Boolean),
    author: a.authors
      ? {
          slug: a.authors.slug,
          displayName: a.authors.display_name,
          isGhost: a.authors.is_ghost,
        }
     : null,
    topics: (a.article_topics ?? []).map((t: AnyRow) => t.topics).filter(Boolean),
    wordsToNotice: ((words.data ?? []) as unknown as AnyRow[]).map((w) => ({
      _id: w.id as string,
      word: w.word as string,
      partOfSpeech: str(w.part_of_speech),
      plainMeaning: w.plain_meaning as string,
      pronunciation: str(w.pronunciation),
      usageExample: str(w.usage_example),
    })),
    editorialLinks: linksData
      .filter((l) => l.to_article)
      .map((l) => ({
        slug: l.to_article.slug as string,
        title: l.to_article.title as string,
        dek: str(l.to_article.dek),
        label: str(l.label),
      })),
    ads: ((ads.data ?? []) as unknown as AnyRow[]).map((x) => ({
      id: x.id as string,
      placement: x.placement as string,
      afterParagraph: num(x.after_paragraph),
      title: str(x.title),
      body: str(x.body),
      ctaLabel: str(x.cta_label),
      ctaUrl: str(x.cta_url),
      kind: x.kind as string,
    })),
  };
}

/** All active corners ordered (§5). */
export async function fetchCorners() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("corners")
    .select("id, slug, name, description, position")
    .eq("is_active", true)
    .order("position");
  if (error) throw error;
  return ((data ?? []) as unknown as AnyRow[]).map((c) => ({
    _id: c.id,
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: str(c.description),
    position: num(c.position),
  }));
}

/** One featured (primary-corner) article per corner (§06.4). Freshest first. */
export async function fetchCornerFeatures(): Promise<
  Record<string, { title: string; slug: string }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("article_corners")
    .select("corners ( slug ), articles!inner ( slug, title, published_at, status )")
    .eq("is_primary", true)
    .eq("articles.status", "published")
    .order("published_at", { ascending: false, foreignTable: "articles" });
  if (error || !data) return {};
  const out: Record<string, { title: string; slug: string }> = {};
  for (const row of (data as unknown as AnyRow[])) {
    const corner = row.corners;
    const article = row.articles;
    if (corner && article && !out[corner.slug]) {
      out[corner.slug] = { title: article.title, slug: article.slug };
    }
  }
  return out;
}

/** Corner by slug. */
export async function fetchCornerBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("corners")
    .select("id, slug, name, description, position")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const c = data as unknown as AnyRow;
  return {
    _id: c.id,
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: str(c.description),
  };
}

/** All authors (§11 index). */
export async function fetchAuthors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("authors")
    .select("id, slug, display_name, short_bio")
    .order("display_name");
  if (error) throw error;
  return ((data ?? []) as unknown as AnyRow[]).map((a) => ({
    _id: a.id,
    id: a.id,
    slug: a.slug,
    displayName: a.display_name,
    short_bio: str(a.short_bio),
  }));
}

/** Author by slug + their published works. */
export async function fetchAuthorBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("authors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const a = data as unknown as AnyRow;

  const works = await supabase
    .from("articles")
    .select("id, slug, title, dek, reading_time_seconds, published_at, content_type")
    .eq("primary_author_id", a.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return {
    ...a,
    _id: a.id as string,
    displayName: a.display_name as string,
    shortBio: str(a.short_bio),
    authorStatement: str(a.author_statement),
    isGhost: a.is_ghost as boolean,
    works: ((works.data ?? []) as unknown as AnyRow[]).map((w) => ({
      _id: w.id,
      slug: w.slug,
      title: w.title,
      dek: str(w.dek),
      reading_time_seconds: num(w.reading_time_seconds),
      published_at: str(w.published_at),
      content_type: str(w.content_type),
    })),
  };
}

/** Published reading paths with steps (§9). */
export async function fetchPaths() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_paths")
    .select(
      `id, slug, title, description, status,
       reading_path_steps ( position, step_title_override, step_intro,
         articles ( id, slug, title, dek, reading_time_seconds, status ) )`,
    )
    .eq("status", "published");
  if (error) throw error;

  return ((data ?? []) as unknown as AnyRow[]).map((p) => {
    const steps = (p.reading_path_steps ?? [])
      .filter((s: AnyRow) => s.articles?.status === "published")
      .sort((x: AnyRow, y: AnyRow) => x.position - y.position)
      .map((s: AnyRow) => ({
        _id: `${p.id}-${s.position}`,
        slug: s.articles.slug,
        title: s.step_title_override ?? s.articles.title,
        dek: str(s.articles.dek),
        intro: str(s.step_intro),
        readingTimeSeconds: num(s.articles.reading_time_seconds),
      }));
    return {
      _id: p.id,
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: str(p.description),
      totalSteps: steps.length,
      totalMinutes: Math.max(
        1,
        Math.round(
          steps.reduce(
            (sum: number, s: { readingTimeSeconds: number }) =>
              sum + s.readingTimeSeconds,
            0,
          ) / 60,
        ),
      ),
      steps,
    };
  });
}

/** One path by slug (§9.3). */
export async function fetchPathBySlug(slug: string) {
  const paths = await fetchPaths();
  return paths.find((p) => p.slug === slug) ?? null;
}

/** Related articles with reasons (§7.9, §17.3). */
export async function fetchRelated(articleId: string, _cornerSlug: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("article_corners")
    .select("articles!inner ( id, slug, title, dek, status )")
    .eq("is_primary", true)
    .neq("article_id", articleId)
    .limit(6);
  if (error || !data) return [];

  const out: Array<{ _id: string; slug: string; title: string; dek: string | null; reason: string }> = [];
  for (const row of (data as unknown as AnyRow[])) {
    const a = row.articles;
    if (!a || a.status !== "published") continue;
    if (out.length >= 3) break;
    out.push({
      _id: a.id,
      slug: a.slug,
      title: a.title,
      dek: str(a.dek),
      reason: "From the same corner",
    });
  }
  return out;
}

/** Vocabulary list (§18). */
export async function fetchVocabulary() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vocabulary_words")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return ((data ?? []) as unknown as AnyRow[]).map((w) => ({
    _id: w.id,
    word: w.word,
    pronunciation: str(w.pronunciation),
    partOfSpeech: str(w.part_of_speech),
    plainMeaning: w.plain_meaning,
    usageExample: str(w.usage_example),
    etymology: str(w.etymology),
    commonMistakes: str(w.common_mistakes),
    relatedWords: (w.related_words ?? []) as string[],
    conversationExamples: (w.conversation_examples ?? []) as string[],
    createdAt: w.created_at as string,
  }));
}

/** Deterministic word of the day (§18). */
export async function fetchWordOfDay() {
  const words = await fetchVocabulary();
  if (words.length === 0) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  return words[day % words.length];
}

/** Articles by topic slug (§topics page). */
export async function fetchTopicBySlug(slug: string) {
  const supabase = await createClient();
  const { data: topic } = await supabase
    .from("topics")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!topic) return null;
  const t = topic as unknown as AnyRow;

  const { data: joins } = await supabase
    .from("article_topics")
    .select(
      "articles ( id, slug, title, dek, reading_time_seconds, published_at, status, content_type )",
    )
    .eq("topic_id", t.id)
    .order("published_at", { foreignTable: "articles", ascending: false });

  const arts = ((joins ?? []) as unknown as AnyRow[])
    .filter((j) => j.articles?.status === "published")
    .map((j) => j.articles);
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: str(t.description),
    articles: arts,
  };
}

/** All topics with counts (topics index chips). */
export async function fetchTopics() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select("id, slug, name, article_topics ( count )")
    .order("name");
  if (error) return [];
  return ((data ?? []) as unknown as AnyRow[]).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    count: num(t.article_topics?.[0]?.count),
  }));
}
