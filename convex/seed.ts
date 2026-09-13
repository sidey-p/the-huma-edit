import { v } from "convex/values";
import {
  internalMutation,
  internalAction,
  internalQuery,
  action,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  ARTICLES,
  READING_PATH,
  VOCABULARY,
  bodyToPlainText,
  bodyToTiptapDoc,
} from "./seedContent";

/**
 * THE HUMAN EDIT - Seed (section 48)
 * Sample content demonstrates every major component. All sample
 * articles carry isSample=true and can be purged before production.
 */

const CORNERS = [
  { slug: "story", name: "The Story Corner", description: "Fiction, personal stories, lived experiences, and memorable narrative pieces.", position: 1 },
  { slug: "english", name: "The English Corner", description: "Learning and enjoying English through real language in real writing.", position: 2 },
  { slug: "growth", name: "The Growth Corner", description: "Self-improvement without productivity-culture pressure.", position: 3 },
  { slug: "thought", name: "The Thought Corner", description: "Ideas, perspectives, philosophy, culture, and questions worth sitting with.", position: 4 },
  { slug: "help", name: "The Help Corner", description: "Useful, practical, readable guidance for everyday problems.", position: 5 },
  { slug: "human", name: "The Human Corner", description: "The lived human experience - identity, belonging, starting over.", position: 6 },
];

const TOPICS: Array<[string, string]> = [
  ["short-stories", "Short Stories"], ["real-stories", "Real Stories"],
  ["fiction", "Fiction"], ["personal-essays", "Personal Essays"],
  ["moments", "Moments"], ["character-life", "Character & Life"],
  ["words", "Words"], ["phrases", "Phrases"], ["writing", "Writing"],
  ["speaking", "Speaking"], ["reading", "Reading"],
  ["grammar-in-context", "Grammar in Context"], ["expressions", "Expressions"],
  ["word-origins", "Word Origins"], ["communication", "Communication"],
  ["habits", "Habits"], ["focus", "Focus"], ["confidence", "Confidence"],
  ["discipline", "Discipline"], ["learning", "Learning"], ["change", "Change"],
  ["personal-growth", "Personal Growth"], ["direction", "Direction"],
  ["philosophy", "Philosophy"], ["perspective", "Perspective"],
  ["culture", "Culture"], ["opinions", "Opinions"], ["questions", "Questions"],
  ["ideas", "Ideas"],
  ["how-to", "How To"], ["everyday-problems", "Everyday Problems"],
  ["decisions", "Decisions"], ["practical-guides", "Practical Guides"],
  ["identity", "Identity"], ["relationships", "Relationships"],
  ["loneliness", "Loneliness"], ["adulthood", "Adulthood"],
  ["family", "Family"], ["ambition", "Ambition"], ["failure", "Failure"],
  ["starting-over", "Starting Over"], ["belonging", "Belonging"],
];

export const seedTaxonomy = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const c of CORNERS) {
      const existing = await ctx.db
        .query("corners")
        .withIndex("by_slug", (q) => q.eq("slug", c.slug))
        .unique();
      if (!existing) {
        await ctx.db.insert("corners", { ...c, isActive: true, createdAt: now, updatedAt: now });
      }
    }
    for (const [slug, name] of TOPICS) {
      const existing = await ctx.db
        .query("topics")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!existing) {
        await ctx.db.insert("topics", { slug, name, createdAt: now, updatedAt: now });
      }
    }
  },
});

export const insertSampleArticles = internalMutation({
  args: {
    articles: v.array(
      v.object({
        slug: v.string(),
        title: v.string(),
        dek: v.string(),
        cornerSlug: v.string(),
        topicSlugs: v.array(v.string()),
        contentType: v.string(),
        readingDepth: v.string(),
        body: v.array(v.string()),
        authorName: v.string(),
      }),
    ),
    path: v.object({
      slug: v.string(),
      title: v.string(),
      description: v.string(),
      steps: v.array(v.string()),
    }),
    vocabulary: v.array(
      v.object({
        word: v.string(),
        pronunciation: v.string(),
        partOfSpeech: v.string(),
        plainMeaning: v.string(),
        usageExample: v.string(),
        etymology: v.string(),
        relatedWords: v.array(v.string()),
        conversationExamples: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Idempotent: skip any slug that already exists
    const existing = await ctx.db.query("articles").collect();
    const existingSlugs = new Set(existing.map((a) => a.slug));
    if (existingSlugs.size > 0 && existingSlugs.has(args.articles[0]?.slug)) {
      return { skipped: true };
    }

    // Authors
    const authorIds = new Map<string, string>();
    for (const a of args.articles) {
      if (authorIds.has(a.authorName)) continue;
      const slug = a.authorName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      const existingAuthor = await ctx.db
        .query("authors")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      const id = existingAuthor
        ? existingAuthor._id
        : await ctx.db.insert("authors", {
            slug,
            displayName: a.authorName,
            isGhost: false,
            createdAt: now,
            updatedAt: now,
          });
      authorIds.set(a.authorName, id);
    }

    const articleIdBySlug = new Map<string, string>();

    for (const a of args.articles) {
      if (existingSlugs.has(a.slug)) continue;
      const wordCount = bodyToPlainText(a.body)
        .split(/\s+/)
        .filter(Boolean).length;
      const readingTimeSeconds = Math.round((wordCount / 220) * 60);

      const articleId = await ctx.db.insert("articles", {
        slug: a.slug,
        title: a.title,
        dek: a.dek,
        contentJson: bodyToTiptapDoc(a.body),
        contentText: bodyToPlainText(a.body),
        status: "published",
        contentType: a.contentType as never,
        readingDepth: a.readingDepth as never,
        primaryAuthorId: authorIds.get(a.authorName) as never,
        readingTimeSeconds,
        wordCount,
        publishedAt: now - Math.floor(Math.random() * 30 * 24 * 3600 * 1000),
        createdAt: now,
        updatedAt: now,
        humanAuthorshipAttested: true,
        isSample: true,
      });
      articleIdBySlug.set(a.slug, articleId);

      // Taxonomy joins
      const corner = await ctx.db
        .query("corners")
        .withIndex("by_slug", (q) => q.eq("slug", a.cornerSlug))
        .unique();
      if (corner) {
        await ctx.db.insert("articleCorners", {
          articleId,
          cornerId: corner._id,
          isPrimary: true,
          position: 0,
        });
      }
      for (const t of a.topicSlugs) {
        const topic = await ctx.db
          .query("topics")
          .withIndex("by_slug", (q) => q.eq("slug", t))
          .unique();
        if (topic) {
          await ctx.db.insert("articleTopics", { articleId, topicId: topic._id });
        }
      }

      // Workflow row + publish revision
      await ctx.db.insert("articleWorkflow", {
        articleId,
        state: "published",
        approvedAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("articleRevisions", {
        articleId,
        revisionNumber: 1,
        contentJson: bodyToTiptapDoc(a.body),
        contentText: bodyToPlainText(a.body),
        metadata: { title: a.title, dek: a.dek },
        reason: "publish",
        createdAt: now,
      });
    }

    // Reading path (section 9.1)
    const pathExists = await ctx.db
      .query("readingPaths")
      .withIndex("by_slug", (q) => q.eq("slug", args.path.slug))
      .unique();
    if (!pathExists) {
      const pathId = await ctx.db.insert("readingPaths", {
        slug: args.path.slug,
        title: args.path.title,
        description: args.path.description,
        status: "published",
        createdAt: now,
        updatedAt: now,
      });
      let position = 1;
      for (const slug of args.path.steps) {
        const articleId = articleIdBySlug.get(slug);
        if (articleId) {
          await ctx.db.insert("readingPathSteps", {
            pathId,
            articleId: articleId as never,
            position,
          });
          position++;
        }
      }
    }

    // Vocabulary cards (section 18)
    for (const w of args.vocabulary) {
      const existingWord = await ctx.db
        .query("vocabularyWords")
        .withIndex("by_word", (q) => q.eq("word", w.word))
        .unique();
      if (!existingWord) {
        await ctx.db.insert("vocabularyWords", {
          word: w.word,
          pronunciation: w.pronunciation,
          partOfSpeech: w.partOfSpeech,
          plainMeaning: w.plainMeaning,
          usageExample: w.usageExample,
          etymology: w.etymology,
          relatedWords: w.relatedWords,
          conversationExamples: w.conversationExamples,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { skipped: false, inserted: articleIdBySlug.size };
  },
});

/** Remove every sample-flagged article and its dependents. */
export const purgeSampleContent = internalMutation({
  args: {},
  handler: async (ctx) => {
    const samples = await ctx.db
      .query("articles")
      .filter((q) => q.eq(q.field("isSample"), true))
      .collect();
    for (const article of samples) {
      const joins = await ctx.db
        .query("articleCorners")
        .filter((q) => q.eq(q.field("articleId"), article._id))
        .collect();
      for (const j of joins) await ctx.db.delete(j._id);
      const topicJoins = await ctx.db
        .query("articleTopics")
        .filter((q) => q.eq(q.field("articleId"), article._id))
        .collect();
      for (const j of topicJoins) await ctx.db.delete(j._id);
      const pathSteps = await ctx.db
        .query("readingPathSteps")
        .filter((q) => q.eq(q.field("articleId"), article._id))
        .collect();
      for (const j of pathSteps) await ctx.db.delete(j._id);
      const revisions = await ctx.db
        .query("articleRevisions")
        .filter((q) => q.eq(q.field("articleId"), article._id))
        .collect();
      for (const r of revisions) await ctx.db.delete(r._id);
      const wf = await ctx.db
        .query("articleWorkflow")
        .filter((q) => q.eq(q.field("articleId"), article._id))
        .unique();
      if (wf) await ctx.db.delete(wf._id);
      await ctx.db.delete(article._id);
    }
    // Remove the sample reading path
    const path = await ctx.db
      .query("readingPaths")
      .withIndex("by_slug", (q) => q.eq("slug", READING_PATH.slug))
      .unique();
    if (path) {
      const steps = await ctx.db
        .query("readingPathSteps")
        .filter((q) => q.eq(q.field("pathId"), path._id))
        .collect();
      for (const s of steps) await ctx.db.delete(s._id);
      await ctx.db.delete(path._id);
    }
    return samples.length;
  },
});

/** One-shot orchestrator: callable via CLI/dashboard (local dev seeding). */
export const seedAll = internalAction({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.seed.seedTaxonomy, {});
    await ctx.runMutation(internal.seed.insertSampleArticles, {
      articles: ARTICLES.map((a) => ({
        slug: a.slug,
        title: a.title,
        dek: a.dek,
        cornerSlug: a.corner,
        topicSlugs: a.topics,
        contentType: a.contentType,
        readingDepth: a.readingDepth,
        body: a.body,
        authorName: a.authorName,
      })),
      path: READING_PATH,
      vocabulary: VOCABULARY,
    });
  },
});

/**
 * Public seed entry for local dev only. It refuses to run against
 * deployments with existing non-sample articles (safety).
 */
export const devSeed = action({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.runQuery(internal.seed.countNonSampleArticles, {});
    if (existing > 0) {
      throw new Error("Refusing to seed: production articles exist. Purge samples or seed manually.");
    }
    await ctx.runMutation(internal.seed.seedTaxonomy, {});
    await ctx.runMutation(internal.seed.insertSampleArticles, {
      articles: ARTICLES.map((a) => ({
        slug: a.slug,
        title: a.title,
        dek: a.dek,
        cornerSlug: a.corner,
        topicSlugs: a.topics,
        contentType: a.contentType,
        readingDepth: a.readingDepth,
        body: a.body,
        authorName: a.authorName,
      })),
      path: READING_PATH,
      vocabulary: VOCABULARY,
    });
    return { seeded: ARTICLES.length };
  },
});

export const countNonSampleArticles = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("articles").collect();
    return all.filter((a) => !a.isSample).length;
  },
});
