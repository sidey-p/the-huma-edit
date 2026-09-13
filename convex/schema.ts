import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * THE HUMAN EDIT — Convex schema
 * Translated from PLAN.md §23 (identity, content, taxonomy, media,
 * search, library, paths, workflow, homepage, audit, vocabulary).
 */

// §23.1 Roles (§31 permissions)
const userRole = v.union(
  v.literal("reader"),
  v.literal("author"),
  v.literal("editor"),
  v.literal("senior_editor"),
  v.literal("admin"),
  v.literal("owner"),
);

// §13.1 Editorial states
const articleStatus = v.union(
  v.literal("idea"),
  v.literal("draft"),
  v.literal("in_review"),
  v.literal("needs_changes"),
  v.literal("approved"),
  v.literal("scheduled"),
  v.literal("published"),
  v.literal("archived"),
);

const contentType = v.union(
  v.literal("essay"),
  v.literal("story"),
  v.literal("guide"),
  v.literal("opinion"),
  v.literal("interview"),
  v.literal("lesson"),
  v.literal("vocabulary"),
  v.literal("reflection"),
  v.literal("explainer"),
);

const readingDepth = v.union(
  v.literal("quick"),
  v.literal("standard"),
  v.literal("deep"),
);

const highlightStyle = v.union(
  v.literal("yellow"),
  v.literal("green"),
  v.literal("blue"),
  v.literal("pink"),
  v.literal("underline"),
);

const revisionReason = v.union(
  v.literal("autosave"),
  v.literal("snapshot"),
  v.literal("explicit"),
  v.literal("publish"),
);

export default defineSchema({
  ...authTables,

  // §23.1 profiles — extends the auth users table
  profiles: defineTable({
    userId: v.id("users"), // Convex Auth user
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    role: userRole,
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_username", ["username"]),

  // §11 authors — public identity (may differ from account)
  authors: defineTable({
    userId: v.optional(v.id("users")),
    profileId: v.optional(v.id("profiles")),
    slug: v.string(),
    displayName: v.string(),
    portraitUrl: v.optional(v.string()),
    shortBio: v.optional(v.string()),
    authorStatement: v.optional(v.string()),
    socialLinks: v.optional(v.array(v.object({ label: v.string(), url: v.string() }))),
    isGhost: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_user", ["userId"]),

  // §23.2 corners — the six editorial worlds
  corners: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
    isActive: v.boolean(),
    visualConfig: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_position", ["isActive", "position"]),

  topics: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    parentTopicId: v.optional(v.id("topics")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parentTopicId"]),

  tags: defineTable({
    slug: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  // §14.1 media — metadata only; files live in Convex Storage
  mediaAssets: defineTable({
    storageId: v.id("_storage"),
    filePath: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    altText: v.optional(v.string()),
    caption: v.optional(v.string()),
    credit: v.optional(v.string()),
    copyrightNote: v.optional(v.string()),
    focalX: v.optional(v.number()),
    focalY: v.optional(v.number()),
    status: v.union(
      v.literal("processing"),
      v.literal("ready"),
      v.literal("archived"),
    ),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .searchIndex("search_all", {
      searchField: "filePath",
      filterFields: ["status", "mimeType"],
    }),

  // §23.2 articles — the core of the publication
  articles: defineTable({
    slug: v.string(),
    title: v.string(),
    dek: v.optional(v.string()),
    // Tiptap JSON document (§46)
    contentJson: v.any(),
    // Derived plain text for search (§46)
    contentText: v.string(),
    status: articleStatus,
    contentType: v.optional(contentType),
    readingDepth: v.optional(readingDepth),
    mood: v.optional(v.string()),
    intent: v.optional(v.string()),
    primaryAuthorId: v.optional(v.id("authors")),
    coverAssetId: v.optional(v.id("mediaAssets")),
    readingTimeSeconds: v.number(),
    wordCount: v.number(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    canonicalUrl: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    correctionNote: v.optional(v.string()),
    // §30 human-authorship provenance
    humanAuthorshipAttested: v.boolean(),
    // §48 dev seed marker — sample content, purgeable before production
    isSample: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_status_published", ["status", "publishedAt"])
    .index("by_author", ["primaryAuthorId", "status"])
    .searchIndex("search_body", {
      searchField: "contentText",
      filterFields: ["status"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status"],
    }),

  // §23.2 revisions — snapshot history (§13.4)
  articleRevisions: defineTable({
    articleId: v.id("articles"),
    revisionNumber: v.number(),
    contentJson: v.any(),
    contentText: v.string(),
    metadata: v.any(),
    createdBy: v.optional(v.id("users")),
    reason: revisionReason,
    createdAt: v.number(),
  })
    .index("by_article_number", ["articleId", "revisionNumber"]),

  // §5.7 taxonomy joins
  articleCorners: defineTable({
    articleId: v.id("articles"),
    cornerId: v.id("corners"),
    isPrimary: v.boolean(),
    position: v.number(),
  })
    .index("by_article", ["articleId"])
    .index("by_corner", ["cornerId"])
    .index("by_primary", ["cornerId", "isPrimary"]),

  articleTopics: defineTable({
    articleId: v.id("articles"),
    topicId: v.id("topics"),
  })
    .index("by_article", ["articleId"])
    .index("by_topic", ["topicId"]),

  articleTags: defineTable({
    articleId: v.id("articles"),
    tagId: v.id("tags"),
  })
    .index("by_article", ["articleId"])
    .index("by_tag", ["tagId"]),

  // §14.3 explicit editorial relationships
  articleRelationships: defineTable({
    fromArticleId: v.id("articles"),
    toArticleId: v.id("articles"),
    relationship: v.union(
      v.literal("related"),
      v.literal("opposing_viewpoint"),
      v.literal("next"),
      v.literal("previous"),
      v.literal("topic_explainer"),
    ),
    note: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_from", ["fromArticleId"])
    .index("by_to", ["toArticleId"]),

  // §8.4 semantic search embeddings
  articleEmbeddings: defineTable({
    articleId: v.id("articles"),
    // §8.5 model dimension: 1536 (OpenAI text-embedding-3-small compatible)
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
    contentHash: v.string(),
    createdAt: v.number(),
  })
    .index("by_article", ["articleId"])
    .index("by_model", ["embeddingModel"])
    .vectorIndex("embedding_vector", {
      vectorField: "embedding",
      dimensions: 1536,
    }),

  // §16.2 editorial search controls
  searchSynonyms: defineTable({
    term: v.string(),
    groupKey: v.string(),
    replacement: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_group", ["groupKey"])
    .index("by_term", ["term"]),

  searchBoosts: defineTable({
    queryPattern: v.string(),
    articleId: v.id("articles"),
    boost: v.number(),
    reason: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_pattern", ["queryPattern"]),

  // §16.1 search analytics
  searchEvents: defineTable({
    sessionId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    query: v.string(),
    filters: v.any(),
    resultCount: v.number(),
    clickedArticleId: v.optional(v.id("articles")),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_query", ["query", "createdAt"])
    .index("by_zero_click", ["clickedArticleId", "createdAt"]),

  // §23.5 reader library
  collections: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  savedArticles: defineTable({
    userId: v.id("users"),
    articleId: v.id("articles"),
    collectionId: v.optional(v.id("collections")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_article", ["userId", "articleId"]),

  readingProgress: defineTable({
    userId: v.id("users"),
    articleId: v.id("articles"),
    revisionId: v.optional(v.id("articleRevisions")),
    progressPercent: v.number(),
    scrollAnchor: v.optional(v.string()),
    lastReadAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_article", ["userId", "articleId"])
    .index("by_user_recent", ["userId", "lastReadAt"]),

  readingHistory: defineTable({
    userId: v.id("users"),
    articleId: v.id("articles"),
    startedAt: v.number(),
    lastSeenAt: v.number(),
    secondsRead: v.number(),
    direction: v.optional(v.string()),
  })
    .index("by_user", ["userId", "lastSeenAt"])
    .index("by_user_article", ["userId", "articleId"]),

  // §10.3 highlights — reference revision for stability
  highlights: defineTable({
    userId: v.id("users"),
    articleId: v.id("articles"),
    revisionId: v.optional(v.id("articleRevisions")),
    selectedText: v.string(),
    anchor: v.any(),
    note: v.optional(v.string()),
    style: highlightStyle,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_article", ["userId", "articleId"]),

  // §23.6 reading paths
  readingPaths: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    coverAssetId: v.optional(v.id("mediaAssets")),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  readingPathSteps: defineTable({
    pathId: v.id("readingPaths"),
    articleId: v.id("articles"),
    position: v.number(),
    stepTitleOverride: v.optional(v.string()),
    stepIntro: v.optional(v.string()),
  }).index("by_path", ["pathId", "position"]),

  userPathProgress: defineTable({
    userId: v.id("users"),
    pathId: v.id("readingPaths"),
    currentPosition: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_path", ["userId", "pathId"])
    .index("by_user", ["userId", "updatedAt"]),

  // §23.7 editorial workflow
  articleWorkflow: defineTable({
    articleId: v.id("articles"),
    state: articleStatus,
    assignedEditorId: v.optional(v.id("users")),
    reviewRequestedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_article", ["articleId"])
    .index("by_state", ["state", "updatedAt"]),

  reviewComments: defineTable({
    articleId: v.id("articles"),
    revisionId: v.optional(v.id("articleRevisions")),
    authorId: v.id("users"),
    parentCommentId: v.optional(v.id("reviewComments")),
    anchor: v.optional(v.any()),
    body: v.string(),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_article", ["articleId", "createdAt"])
    .index("by_parent", ["parentCommentId"]),

  // §23.8 homepage composition (§15)
  homepageVersions: defineTable({
    name: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("scheduled"),
      v.literal("archived"),
    ),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    config: v.any(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status", "startsAt"]),

  // §23.9 audit
  auditLogs: defineTable({
    actorId: v.optional(v.id("users")),
    action: v.string(),
    entity: v.string(),
    entityId: v.optional(v.string()),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_entity", ["entity", "entityId", "createdAt"])
    .index("by_created", ["createdAt"]),

  // §7.5 reader preferences
  readerPreferences: defineTable({
    userId: v.id("users"),
    readingTheme: v.union(v.literal("light"), v.literal("dark"), v.literal("warm")),
    fontSize: v.union(v.literal("s"), v.literal("m"), v.literal("l"), v.literal("xl")),
    lineHeight: v.union(v.literal("compact"), v.literal("m"), v.literal("relaxed")),
    readingFace: v.union(v.literal("serif"), v.literal("sans")),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // §18 English Corner
  vocabularyWords: defineTable({
    word: v.string(),
    pronunciation: v.optional(v.string()),
    partOfSpeech: v.optional(v.string()),
    plainMeaning: v.string(),
    usageExample: v.optional(v.string()),
    etymology: v.optional(v.string()),
    commonMistakes: v.optional(v.string()),
    relatedWords: v.optional(v.array(v.string())),
    conversationExamples: v.optional(v.array(v.string())),
    sourceArticleId: v.optional(v.id("articles")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_word", ["word"])
    .searchIndex("search_word", { searchField: "word" }),

  userVocabulary: defineTable({
    userId: v.id("users"),
    wordId: v.id("vocabularyWords"),
    personalNote: v.optional(v.string()),
    discoveredAt: v.number(),
  })
    .index("by_user", ["userId", "discoveredAt"])
    .index("by_user_word", ["userId", "wordId"]),

  // §12.6 scratchpad — private idea space
  scratchpadNotes: defineTable({
    userId: v.id("users"),
    body: v.string(),
    kind: v.union(
      v.literal("idea"),
      v.literal("quote"),
      v.literal("link"),
      v.literal("fragment"),
      v.literal("note"),
      v.literal("seed"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId", "updatedAt"]),
});
