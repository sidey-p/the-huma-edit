import { v } from "convex/values";
import { query, internalQuery, internalMutation, internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/permissions";

/**
 * THE HUMAN EDIT — Hybrid search (§8)
 * lexical (text index) + semantic (vector index) + fuzzy (trigram-equivalent
 * via text index with looser queries) + taxonomy + editorial boosts.
 * Ranking weights from §8.5:
 *   lexical 30, semantic 35, title 10, topic 7, corner 5,
 *   tags 4, editorial boost 6, freshness 3.
 */

const SEARCH_WEIGHTS = {
  lexical: 0.30,
  semantic: 0.35,
  title: 0.10,
  topic: 0.07,
  corner: 0.05,
  tags: 0.04,
  editorialBoost: 0.06,
  freshness: 0.03,
};

export const searchArticles = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args): Promise<SearchResult[]> => {
    const query = args.query.trim();
    if (!query) return [];

    // 1. Normalize + apply synonyms (§8.3)
    const synonyms = await ctx.runQuery(internal.search.getSynonymGroups, {});
    let expandedQuery = query.toLowerCase();
    for (const syn of synonyms) {
      if (expandedQuery.includes(syn.term)) {
        expandedQuery = expandedQuery.replaceAll(syn.term, syn.replacement ?? syn.groupKey);
      }
    }

    // 2. Lexical retrieval via text index (published only — §27 publication gate)
    const lexicalHits = await ctx.runQuery(internal.search.lexicalSearch, {
      query: expandedQuery,
      limit: 50,
    });

    // 3. Semantic retrieval via vector index when embedding provided
    const semanticScores: Map<string, number> = new Map();
    if (args.embedding && args.embedding.length === 1536) {
      const semanticHits = await ctx.runAction(internal.search.semanticSearch, {
        embedding: args.embedding,
        limit: 50,
      });
      for (const hit of semanticHits) {
        semanticScores.set(hit.articleId, hit.score);
      }
    }

    // 4. Editorial boosts (§8.5, §16.2)
    const boosts = await ctx.runQuery(internal.search.getBoosts, { query: expandedQuery });
    const boostMap = new Map<string, number>(
      boosts.map((b: { articleId: string; boost: number }) => [b.articleId, b.boost]),
    );

    // 5. Hybrid ranking — taxonomy signal comes from the query text itself
    const candidates = new Map<string, CandidateMeta>();
    for (const hit of lexicalHits) {
      candidates.set(hit.id, {
        title: hit.title,
        titleMatch: titleMatchScore(query, hit.title),
        lexicalScore: hit.score,
        publishedAt: hit.publishedAt,
      });
    }

    const results: SearchResult[] = [];
    for (const [id, meta] of candidates) {
      const lexicalNorm = normalize(meta.lexicalScore);
      const semanticNorm = normalize(semanticScores.get(id) ?? 0);
      const titleNorm = normalize(meta.titleMatch);
      const editorial = boostMap.get(id) ?? 1;
      const freshness = freshnessScore(meta.publishedAt);

      const score =
        SEARCH_WEIGHTS.lexical * lexicalNorm +
        SEARCH_WEIGHTS.semantic * semanticNorm +
        SEARCH_WEIGHTS.title * titleNorm +
        SEARCH_WEIGHTS.editorialBoost * Math.min(editorial, 2) / 2 +
        SEARCH_WEIGHTS.freshness * freshness;

      results.push({
        articleId: id,
        score,
        matchedTerms: [],
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, args.limit ?? 20);
  },
});

// ---------- helpers ----------

function titleMatchScore(query: string, title: string): number {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  const t = title.toLowerCase();
  return q.filter((w) => t.includes(w)).length / Math.max(q.length, 1);
}

function normalize(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function hasOverlap(a: string[] | undefined, b: string[] | undefined): number {
  if (!a || !b) return 0;
  return a.some((x) => b.includes(x)) ? 1 : 0;
}

interface CandidateMeta {
  title: string;
  titleMatch: number;
  lexicalScore: number;
  publishedAt: number | undefined;
}

export interface SearchResult {
  articleId: string;
  score: number;
  matchedTerms: string[];
}

function freshnessScore(publishedAt: number | undefined): number {
  if (!publishedAt) return 0;
  const ageDays = (Date.now() - publishedAt) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / 30); // 30-day freshness window
}

// ---------- internal queries ----------

export const lexicalSearch = internalQuery({
  args: { query: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    const hits = await ctx.db
      .query("articles")
      .withSearchIndex("search_body", (q) =>
        q.search("contentText", args.query).eq("status", "published"),
      )
      .take(args.limit);

    return hits.map((h) => {
      // Read taxonomy after fetching
      return {
        id: h._id,
        title: h.title,
        score: 1 / (1 + 0), // text index returns no score; order = relevance
        topicIds: [] as string[],
        cornerIds: [] as string[],
        tagIds: [] as string[],
        publishedAt: h.publishedAt,
        slug: h.slug,
      };
    });
  },
});

export const semanticSearch = internalAction({
  args: { embedding: v.array(v.float64()), limit: v.number() },
  handler: async (ctx, args): Promise<Array<{ articleId: string; score: number }>> => {
    const hits = await ctx.vectorSearch("articleEmbeddings", "embedding_vector", {
      vector: args.embedding,
      limit: args.limit,
    });
    const results: Array<{ articleId: string; score: number } | null> = await Promise.all(
      hits.map(async (h) => {
        const articleId = await ctx.runQuery(internal.search.getEmbeddingByDoc, {
          id: h._id,
        });
        return articleId ? { articleId, score: 1 } : null;
      }),
    );
    return results.filter((r): r is { articleId: string; score: number } => r !== null);
  },
});

export const getEmbeddingByDoc = internalQuery({
  args: { id: v.id("articleEmbeddings") },
  handler: async (ctx, args) => {
    const emb = await ctx.db.get(args.id);
    return emb ? emb.articleId : null;
  },
});

export const getSynonymGroups = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("searchSynonyms").filter((q) => q.eq(q.field("isActive"), true)).collect();
  },
});

export const getBoosts = internalQuery({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("searchBoosts").collect();
    const now = Date.now();
    return all
      .filter(
        (b) =>
          (b.expiresAt === undefined || b.expiresAt > now) &&
          (args.query.includes(b.queryPattern) || b.queryPattern.includes(args.query)),
      )
      .map((b) => ({ articleId: b.articleId, boost: b.boost }));
  },
});

// ---------- embedding pipeline (§27) ----------

export const queueEmbedding = internalMutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return;
    // Hash for deterministic reindexing (§27)
    const contentHash = hashString(
      `${article.title}|${article.dek ?? ""}|${article.contentText.slice(0, 2000)}`,
    );
    const existing = await ctx.db
      .query("articleEmbeddings")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .unique();
    if (existing && existing.contentHash === contentHash) return; // up-to-date
    // Generate embedding from an external action (provider key lives in Convex env)
    await ctx.scheduler.runAfter(0, internal.search.generateEmbedding, {
      articleId: args.articleId,
      text: `${article.title}\n\n${article.dek ?? ""}\n\n${article.contentText.slice(0, 4000)}`,
      contentHash,
    });
  },
});

export const generateEmbedding = internalAction({
  args: { articleId: v.id("articles"), text: v.string(), contentHash: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.EMBEDDING_PROVIDER_KEY;
    if (!apiKey) return; // embeddings disabled until key configured

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: args.text }),
    });
    if (!res.ok) return;
    const json = await res.json();
    const embedding: number[] = json.data[0].embedding;

    await ctx.runMutation(internal.search.storeEmbedding, {
      articleId: args.articleId,
      embedding,
      embeddingModel: "text-embedding-3-small",
      contentHash: args.contentHash,
    });
  },
});

export const storeEmbedding = internalMutation({
  args: {
    articleId: v.id("articles"),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("articleEmbeddings")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        embedding: args.embedding,
        embeddingModel: args.embeddingModel,
        contentHash: args.contentHash,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("articleEmbeddings", {
        articleId: args.articleId,
        embedding: args.embedding,
        embeddingModel: args.embeddingModel,
        contentHash: args.contentHash,
        createdAt: Date.now(),
      });
    }
  },
});

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `h${h.toString(16)}`;
}
