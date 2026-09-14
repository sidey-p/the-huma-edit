/**
 * Generates supabase/seed.sql from supabase/seedContent.ts.
 * Idempotent: on conflict do nothing / update.
 */
import { ARTICLES, AUTHORS, READING_PATH, VOCABULARY, ARTICLE_LINKS } from "../supabase/seedContent.ts";
import { writeFileSync } from "node:fs";

const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";

function tiptapDoc(body) {
  const content = body.map((para) =>
    para.startsWith("## ")
      ? { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: para.slice(3) }] }
      : para.startsWith("# ")
        ? { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: para.slice(2) }] }
        : { type: "paragraph", content: [{ type: "text", text: para }] },
  );
  return { type: "doc", content };
}

function readingTime(body) {
  const words = body.join(" ").split(/\s+/).filter(Boolean).length;
  return { seconds: Math.max(60, Math.round((words / 200) * 60)), words };
}

let sql = `-- ============================================================
-- THE HUMAN EDIT — Supabase seed (generated from seedContent.ts)
-- Idempotent: re-running updates in place.
-- ============================================================

-- Corners (§05)
insert into corners (slug, name, description, position) values
  ('story',    'The Story Corner',   'Fiction, personal stories, lived experiences, and memorable narrative pieces.', 1),
  ('english',  'The English Corner', 'Learning and enjoying English through real language in real writing.', 2),
  ('growth',   'The Growth Corner',  'Self-improvement without productivity-culture pressure.', 3),
  ('thought',  'The Thought Corner', 'Ideas, perspectives, philosophy, culture, and questions worth sitting with.', 4),
  ('help',     'The Help Corner',    'Useful, practical, readable guidance for everyday problems.', 5),
  ('human',    'The Human Corner',   'The lived human experience - identity, belonging, starting over.', 6)
on conflict (slug) do update set name = excluded.name, description = excluded.description;

-- Default homepage config (§15): section order for the composer
insert into homepage_config (sections) values
('[{"type":"hero"},{"type":"edit"},{"type":"corners"},{"type":"new-writing"}]'::jsonb)
on conflict do nothing;

-- Sample synonyms for search expansion (§8.3)
insert into search_synonyms (term, group_key, replacement, is_active) values
  ('stuck', 'direction', 'direction change', true),
  ('tired', 'sleep', 'sleep rest', true),
  ('english', 'language', 'words language', true)
on conflict do nothing;
`;

// Authors
sql += `\n-- Authors (§11)\n`;
for (const [key, name] of Object.entries(AUTHORS)) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  sql += `insert into authors (slug, display_name) values (${esc(slug)}, ${esc(name)}) on conflict (slug) do nothing;\n`;
}

// Articles + taxonomy joins
sql += `\n-- Articles\n`;
for (const a of ARTICLES) {
  const { seconds, words } = readingTime(a.body);
  const doc = tiptapDoc(a.body);
  const authorSlug = a.authorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const plain = a.body.join("\n\n").replace(/## /g, "");
  sql += `insert into articles (slug, title, dek, content_json, content_text, status, content_type, reading_depth, primary_author_id, reading_time_seconds, word_count, published_at, is_sample, human_authorship_attested)
values (${esc(a.slug)}, ${esc(a.title)}, ${esc(a.dek)}, ${esc(JSON.stringify(doc))}::jsonb, ${esc(plain)}, 'published', '${a.contentType}', '${a.readingDepth}', (select id from authors where slug = ${esc(authorSlug)}), ${seconds}, ${words}, now() - interval '${ARTICLES.indexOf(a)} days', true, true)
on conflict (slug) do update set dek = excluded.dek, content_json = excluded.content_json, content_text = excluded.content_text, updated_at = now();\n`;
  sql += `insert into article_corners (article_id, corner_id, is_primary, position) values ((select id from articles where slug = ${esc(a.slug)}), (select id from corners where slug = ${esc(a.corner)}), true, 0) on conflict do nothing;\n`;
  sql += `insert into article_workflow (article_id, state, approved_at) values ((select id from articles where slug = ${esc(a.slug)}), 'published', now()) on conflict (article_id) do update set state = 'published';\n`;
  for (const t of a.topics) {
    sql += `insert into topics (slug, name) values (${esc(t)}, ${esc(t.replace(/-/g, " "))}) on conflict (slug) do nothing;\n`;
    sql += `insert into article_topics (article_id, topic_id) values ((select id from articles where slug = ${esc(a.slug)}), (select id from topics where slug = ${esc(t)})) on conflict do nothing;\n`;
  }
}

// Reading path
sql += `\n-- Reading path (§09)\n`;
sql += `insert into reading_paths (slug, title, description, status) values (${esc(READING_PATH.slug)}, ${esc(READING_PATH.title)}, ${esc(READING_PATH.description)}, 'published') on conflict (slug) do nothing;\n`;
READING_PATH.steps.forEach((stepSlug, i) => {
  sql += `insert into reading_path_steps (path_id, article_id, position) values ((select id from reading_paths where slug = ${esc(READING_PATH.slug)}), (select id from articles where slug = ${esc(stepSlug)}), ${i}) on conflict do nothing;\n`;
});

// Vocabulary
sql += `\n-- Vocabulary (§18)\n`;
for (const w of VOCABULARY) {
  const related = w.relatedWords ? `array[${w.relatedWords.map((r) => esc(r)).join(",")}]` : "null";
  const convo = w.conversationExamples ? `array[${w.conversationExamples.map((r) => esc(r)).join(",")}]` : "null";
  const source = w.sourceArticleSlug
    ? `(select id from articles where slug = ${esc(w.sourceArticleSlug)})`
    : "null";
  sql += `insert into vocabulary_words (word, pronunciation, part_of_speech, plain_meaning, usage_example, etymology, common_mistakes, related_words, conversation_examples, source_article_id)
values (${esc(w.word)}, ${esc(w.pronunciation ?? "")}, ${esc(w.partOfSpeech ?? "")}, ${esc(w.plainMeaning)}, ${esc(w.usageExample ?? "")}, ${esc(w.etymology ?? "")}, ${esc(w.commonMistakes ?? "")}, ${related}, ${convo}, ${source})
on conflict (word) do update set pronunciation = excluded.pronunciation, common_mistakes = excluded.common_mistakes, source_article_id = excluded.source_article_id, updated_at = now();\n`;
}

// Editorial in-article links (§14.3)
sql += `\n-- In-article editorial links\n`;
sql += `delete from article_links where from_article_id in (select id from articles where is_sample);\n`;
for (const [fromSlug, links] of Object.entries(ARTICLE_LINKS)) {
  links.forEach((l, i) => {
    sql += `insert into article_links (from_article_id, to_article_id, label, position) values ((select id from articles where slug = ${esc(fromSlug)}), (select id from articles where slug = ${esc(l.to)}), ${esc(l.label)}, ${i});\n`;
  });
}

// Sample ad (§premium reference — placed in one article only)
sql += `\n-- Sample premium ad slot (reference placement, one article only)\n`;
sql += `delete from ad_slots where article_id = (select id from articles where slug = 'how-people-actually-change');\n`;
sql += `insert into ad_slots (article_id, placement, after_paragraph, title, body, cta_label, cta_url, kind, is_active)
values ((select id from articles where slug = 'how-people-actually-change'), 'mid', 2,
  'Read without interruptions',
  'Members read The Human Edit without ads, keep unlimited highlights, and get new corners first.',
  'See membership', '/premium', 'premium', true);\n`;

sql += `\n-- done\n`;
writeFileSync("supabase/seed.sql", sql);
console.log(`Wrote supabase/seed.sql (${(sql.length / 1024).toFixed(1)} KB, ${ARTICLES.length} articles, ${Object.keys(ARTICLE_LINKS).length} linked)`);
