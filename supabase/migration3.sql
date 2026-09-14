-- ============================================================
-- THE HUMAN EDIT — Migration 3: polish + reliability
-- Run AFTER schema.sql + seed.sql + migration2.sql.
-- ============================================================

-- ---------- site-wide theme preference (roams across devices) ----------
alter table reader_preferences
  add column if not exists site_theme text not null default 'auto'
  check (site_theme in ('light','dark','auto'));

-- ---------- demo ad slot on the first sample article (premium reference) ----------
insert into ad_slots (article_id, placement, after_paragraph, title, body, cta_label, cta_url, kind, is_active)
select a.id, 'mid', 3,
  'Read without interruptions',
  'Members read every piece ad-free, keep unlimited highlights, and sync their library everywhere. One small plan, the whole reading room.',
  'Go ad-free', '/premium', 'premium', true
from articles a
where a.is_sample = true
  and not exists (select 1 from ad_slots x where x.article_id = a.id and x.placement = 'mid')
order by a.published_at asc
limit 1;

-- link the demo ad to the vocabulary feature piece too (a second sample)
insert into ad_slots (article_id, placement, after_paragraph, title, body, cta_label, cta_url, kind, is_active)
select a.id, 'end', 12,
  'Keep every word you meet',
  'Members save unlimited words to a personal vocabulary and read every corner without interruption.',
  'See the plans', '/premium', 'premium', true
from articles a
where a.is_sample = true
  and not exists (select 1 from ad_slots x where x.article_id = a.id and x.placement = 'end')
order by a.published_at asc
limit 1;

-- ---------- editorial links: connect the first two sample articles ----------
insert into article_links (from_article_id, to_article_id, label, position)
select a.id, b.id, 'Related: start here', 0
from articles a, articles b
where a.is_sample = true and b.is_sample = true
  and a.id < b.id
  and not exists (select 1 from article_links x where x.from_article_id = a.id)
order by a.published_at asc, b.published_at asc
limit 1;
