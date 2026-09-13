# THE HUMAN EDIT

**BY HUMANS. FOR HUMANS.** — a human-first editorial reading platform.
Next.js 16 (App Router, TypeScript, Tailwind v4) + Convex (database, auth,
search) + Tiptap (editorial editor) + Motion (interaction).

## Local launch (two terminals)

```bash
# Terminal 1 — Convex backend (port 3210)
npx convex dev

# Terminal 2 — Next.js (port 3000)
pnpm dev
```

Open http://localhost:3000

## The stack

| Layer | Tech |
|---|---|
| App | Next.js 16.3.5, React 19, TypeScript, Tailwind v4 |
| Database | Convex (local: `.convex/local/default`) |
| Auth | Convex Auth (email+password, JWT) — first account becomes **owner** |
| Editor | Tiptap 3 (autosave, outline, word count) |
| Motion | Motion (respects `prefers-reduced-motion`) |
| Search | Convex hybrid: text index + vector index (§8.5 weights) |

## Scripts

```bash
pnpm dev          # Next.js dev server
pnpm build        # production build
npx convex dev    # Convex backend + function push (keep running)
pnpm seed         # seed 22 sample articles + path + vocabulary (idempotent)
node scripts/search-test.mjs    # search smoke test
node scripts/auth-verify.mjs    # auth + desk smoke test
node scripts/workflow-test.mjs  # editorial workflow E2E (creates + publishes a test piece; delete after)
```

## Map (vs PLAN.md)

- §4.1 routes — all public pages live (`/`, `/explore`, `/corners/*`,
  `/topics/*` via corner taxonomy, `/articles/*`, `/authors/*`, `/paths/*`,
  `/archive`, `/english/vocabulary`, policy pages, 404)
- §6 homepage — hero, The Edit, corner discovery, new writing
- §7 article — SSR reading layout, themes (light/dark/warm), text size,
  TOC rail, progress bar, save; end-of-article "Keep reading" with reasons
- §8 search — `/search`, natural-language queries, zero state, §8.5 ranking
- §9 paths — `/paths`, ordered steps with time estimates
- §10 library — saves, progress, continue reading, history, highlights
- §12 studio — Desk, Writer Desk (autosave/outline/stats), publication
  checklist, workflow bar (submit review / approve / publish)
- §13 workflow — full state machine enforced server-side
- §18 English Corner — vocabulary cards at `/english/vocabulary`
- §22 a11y — semantic landmarks, focus-visible, aria, reduced-motion
- §29 SEO — metadata, OG, dynamic sitemap (47 URLs), robots
- §30 policies — human-authorship + editorial policy pages
- §31 roles — reader → owner, enforced in every Convex function
- Sample content — `isSample: true`, purge via `internal.seed.purgeSampleContent`

## Test account

`owner@humanedit.test` / `testpassword123` (created during verification) —
owner role, full Studio access.

## Notes

- Semantic search embeddings activate when `EMBEDDING_PROVIDER_KEY` is set
  as a Convex deployment env var; lexical + boosts + freshness work without it.
- Local Convex data lives in `.convex/local/` (git-ignored). Delete it to
  reset, then re-run `pnpm seed`.
