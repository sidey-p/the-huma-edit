-- ============================================================
-- THE HUMAN EDIT — Supabase schema (migrated from Convex)
-- §23 data model: identity, content, taxonomy, search, library,
-- paths, workflow, audit, vocabulary. RLS per §24.
-- ============================================================

create extension if not exists "pg_trgm";

-- ---------- enums ----------
create type user_role as enum ('reader','author','editor','senior_editor','admin','owner');
create type article_status as enum ('idea','draft','in_review','needs_changes','approved','scheduled','published','archived');
create type content_type as enum ('essay','story','guide','opinion','interview','lesson','vocabulary','reflection','explainer');
create type reading_depth as enum ('quick','standard','deep');
create type highlight_style as enum ('yellow','green','blue','pink','underline');
create type revision_reason as enum ('autosave','snapshot','explicit','publish');
create type path_status as enum ('draft','published','archived');

-- ---------- §23.1 identity ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  role user_role not null default 'reader',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- First user on a fresh project becomes owner (§31)
create function handle_new_user() returns trigger security definer set search_path = public as $$
begin
  insert into public.profiles (id, role)
  values (new.id, case when (select count(*) from public.profiles) = 0 then 'owner' else 'reader' end)
  on conflict (id) do nothing;
  insert into public.reader_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- role helpers (§31 permissions)
create function my_role() returns user_role
stable language sql security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create function has_role(minimum user_role) returns boolean
stable language plpgsql security definer set search_path = public as $$
declare rank int; begin
  select case minimum
    when 'reader' then 0 when 'author' then 1 when 'editor' then 2
    when 'senior_editor' then 3 when 'admin' then 4 when 'owner' then 5 end into rank;
  return coalesce((
    select case p.role
      when 'reader' then 0 when 'author' then 1 when 'editor' then 2
      when 'senior_editor' then 3 when 'admin' then 4 when 'owner' then 5 end >= rank
    from profiles p where p.id = auth.uid() and p.is_active), false);
end $$;

-- ---------- §11 authors ----------
create table authors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  profile_id uuid references profiles(id) on delete set null,
  slug text unique not null,
  display_name text not null,
  portrait_url text,
  short_bio text,
  author_statement text,
  social_links jsonb,
  is_ghost boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- §23.2 taxonomy ----------
create table corners (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  position int not null default 0,
  is_active boolean not null default true,
  visual_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  parent_topic_id uuid references topics(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------- §14.1 media (metadata only) ----------
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text,
  file_path text not null,
  mime_type text not null,
  size bigint not null default 0,
  width int, height int,
  alt_text text, caption text, credit text, copyright_note text,
  focal_x numeric, focal_y numeric,
  status text not null default 'ready' check (status in ('processing','ready','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- §23.2 articles ----------
create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  dek text,
  content_json jsonb,
  content_text text not null default '',
  status article_status not null default 'draft',
  content_type content_type,
  reading_depth reading_depth,
  mood text, intent text,
  primary_author_id uuid references authors(id) on delete set null,
  cover_asset_id uuid references media_assets(id) on delete set null,
  reading_time_seconds int not null default 0,
  word_count int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  canonical_url text,
  seo_title text,
  seo_description text,
  correction_note text,
  human_authorship_attested boolean not null default true,
  is_sample boolean not null default false
);
create index articles_status_published_idx on articles (status, published_at desc);
create index articles_by_author_idx on articles (primary_author_id, status);
create index articles_title_trgm_idx on articles using gin (title gin_trgm_ops);
create index articles_content_trgm_idx on articles using gin (content_text gin_trgm_ops);
create index articles_fts_idx on articles using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(dek,'') || ' ' || content_text));

create table article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  revision_number int not null,
  content_json jsonb,
  content_text text not null default '',
  metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  reason revision_reason not null default 'snapshot',
  created_at timestamptz not null default now(),
  unique (article_id, revision_number)
);

create table article_corners (
  article_id uuid not null references articles(id) on delete cascade,
  corner_id uuid not null references corners(id) on delete cascade,
  is_primary boolean not null default false,
  position int not null default 0,
  primary key (article_id, corner_id)
);

create table article_topics (
  article_id uuid not null references articles(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (article_id, topic_id)
);

create table article_tags (
  article_id uuid not null references articles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

-- ---------- §14.3 relationships ----------
create table article_relationships (
  id uuid primary key default gen_random_uuid(),
  from_article_id uuid not null references articles(id) on delete cascade,
  to_article_id uuid not null references articles(id) on delete cascade,
  relationship text not null check (relationship in ('related','opposing_viewpoint','next','previous','topic_explainer')),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- §16.2 search controls ----------
create table search_synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  group_key text not null,
  replacement text,
  is_active boolean not null default true
);

create table search_boosts (
  id uuid primary key default gen_random_uuid(),
  query_pattern text not null,
  article_id uuid not null references articles(id) on delete cascade,
  boost numeric not null default 1,
  reason text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table search_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  query text not null,
  filters jsonb,
  result_count int not null default 0,
  clicked_article_id uuid references articles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- §23.5 reader library ----------
create table collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table saved_articles (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  collection_id uuid references collections(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  revision_id uuid references article_revisions(id) on delete set null,
  progress_percent numeric not null default 0,
  scroll_anchor text,
  last_read_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, article_id)
);

create table reading_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seconds_read int not null default 0,
  direction text,
  unique (user_id, article_id)
);

create table highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  revision_id uuid references article_revisions(id) on delete set null,
  selected_text text not null,
  anchor jsonb,
  note text,
  style highlight_style not null default 'yellow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- §23.6 reading paths ----------
create table reading_paths (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  cover_asset_id uuid references media_assets(id) on delete set null,
  status path_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table reading_path_steps (
  path_id uuid not null references reading_paths(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  position int not null,
  step_title_override text,
  step_intro text,
  primary key (path_id, position)
);

create table user_path_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  path_id uuid not null references reading_paths(id) on delete cascade,
  current_position int not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, path_id)
);

-- ---------- §23.7 workflow ----------
create table article_workflow (
  article_id uuid primary key references articles(id) on delete cascade,
  state article_status not null default 'draft',
  assigned_editor_id uuid references auth.users(id) on delete set null,
  review_requested_at timestamptz,
  approved_at timestamptz,
  scheduled_for timestamptz,
  updated_at timestamptz not null default now()
);

create table review_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  revision_id uuid references article_revisions(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references review_comments(id) on delete cascade,
  anchor jsonb,
  body text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- §23.8 homepage ----------
create table homepage_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','scheduled','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  config jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- §23.9 audit ----------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ---------- §7.5 reader preferences ----------
create table reader_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reading_theme text not null default 'light' check (reading_theme in ('light','dark','warm')),
  font_size text not null default 'm' check (font_size in ('s','m','l','xl')),
  line_height text not null default 'm' check (line_height in ('compact','m','relaxed')),
  reading_face text not null default 'serif' check (reading_face in ('serif','sans')),
  updated_at timestamptz not null default now()
);

-- ---------- §18 vocabulary ----------
create table vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  word text unique not null,
  pronunciation text,
  part_of_speech text,
  plain_meaning text not null,
  usage_example text,
  etymology text,
  common_mistakes text,
  related_words text[],
  conversation_examples text[],
  source_article_id uuid references articles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references vocabulary_words(id) on delete cascade,
  personal_note text,
  discovered_at timestamptz not null default now(),
  unique (user_id, word_id)
);

-- ---------- §12.6 scratchpad ----------
create table scratchpad_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  kind text not null default 'note' check (kind in ('idea','quote','link','fragment','note','seed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- §24 ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table authors enable row level security;
alter table corners enable row level security;
alter table topics enable row level security;
alter table tags enable row level security;
alter table media_assets enable row level security;
alter table articles enable row level security;
alter table article_revisions enable row level security;
alter table article_corners enable row level security;
alter table article_topics enable row level security;
alter table article_tags enable row level security;
alter table article_relationships enable row level security;
alter table search_synonyms enable row level security;
alter table search_boosts enable row level security;
alter table search_events enable row level security;
alter table collections enable row level security;
alter table saved_articles enable row level security;
alter table reading_progress enable row level security;
alter table reading_history enable row level security;
alter table highlights enable row level security;
alter table reading_paths enable row level security;
alter table reading_path_steps enable row level security;
alter table user_path_progress enable row level security;
alter table article_workflow enable row level security;
alter table review_comments enable row level security;
alter table homepage_versions enable row level security;
alter table audit_logs enable row level security;
alter table reader_preferences enable row level security;
alter table vocabulary_words enable row level security;
alter table user_vocabulary enable row level security;
alter table scratchpad_notes enable row level security;

-- profiles: self read/update; public writers visible via authors table instead
create policy "profiles self select" on profiles for select using (id = auth.uid());
create policy "profiles self update" on profiles for update using (id = auth.uid());

-- public read: published taxonomy + paths
create policy "corners public read" on corners for select using (is_active or has_role('editor'));
create policy "topics public read" on topics for select using (true);
create policy "tags public read" on tags for select using (true);
create policy "authors public read" on authors for select using (true);
create policy "reading paths public read" on reading_paths for select
  using (status = 'published' or has_role('editor'));
create policy "path steps public read" on reading_path_steps for select using (true);
create policy "vocabulary public read" on vocabulary_words for select using (true);

-- articles: public sees published; authors see own; editors+ see all
create policy "articles public read" on articles for select
  using (status = 'published' or has_role('editor') or primary_author_id in (select id from authors where user_id = auth.uid()));
create policy "articles author write" on articles for update
  using (has_role('author'));
create policy "articles editor insert" on articles for insert
  with check (has_role('author'));
create policy "articles editor delete" on articles for delete
  using (has_role('admin'));

create policy "revisions read" on article_revisions for select
  using (exists (select 1 from articles a where a.id = article_id and (a.status = 'published' or has_role('editor'))));
create policy "joins public read" on article_corners for select using (true);
create policy "joins topics read" on article_topics for select using (true);
create policy "joins tags read" on article_tags for select using (true);
create policy "relationships read" on article_relationships for select using (true);

-- reader-owned tables (§24): strictly self
create policy "collections self" on collections for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "saved self" on saved_articles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress self" on reading_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "history self" on reading_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "highlights self" on highlights for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "path progress self" on user_path_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "prefs self" on reader_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user vocab self" on user_vocabulary for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "scratchpad self" on scratchpad_notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- search events: anyone can insert, editors can read
create policy "search events insert" on search_events for insert with check (true);
create policy "search events read" on search_events for select using (has_role('editor'));

-- editor-only controls
create policy "synonyms editor" on search_synonyms for all using (has_role('editor')) with check (has_role('editor'));
create policy "boosts editor" on search_boosts for all using (has_role('editor')) with check (has_role('editor'));

-- workflow: editors+ manage; authors read own
create policy "workflow read" on article_workflow for select
  using (has_role('author'));
create policy "workflow write" on article_workflow for update
  using (has_role('author'));
create policy "workflow insert" on article_workflow for insert
  with check (has_role('author'));

create policy "comments editorial" on review_comments for all
  using (has_role('author')) with check (has_role('author'));

create policy "homepage editor" on homepage_versions for all
  using (has_role('editor')) with check (has_role('editor'));

create policy "audit editor read" on audit_logs for select using (has_role('admin'));
create policy "audit insert" on audit_logs for insert with check (has_role('author'));

-- media: public read ready, editors manage
create policy "media public read" on media_assets for select using (status = 'ready' or has_role('author'));
create policy "media manage" on media_assets for all using (has_role('author')) with check (has_role('author'));

-- ---------- §8 search: hybrid full-text + trigram ranking function ----------
create or replace function search_articles(q text, lim int default 20)
returns table (id uuid, slug text, title text, dek text, reading_time_seconds int, published_at timestamptz, corner_name text, score numeric)
language sql stable as $$
  with published as (
    select a.*, 0::numeric as base from articles a where a.status = 'published'
  ),
  scored as (
    select p.id, p.slug, p.title, p.dek, p.reading_time_seconds, p.published_at,
      (
        -- lexical FTS ~30%
        0.30 * coalesce(ts_rank(to_tsvector('english', p.title || ' ' || coalesce(p.dek,'') || ' ' || p.content_text), plainto_tsquery('english', q)), 0)
        -- trigram fuzzy ~ lexical equivalent
        + 0.15 * coalesce(similarity(p.title, q), 0)
        + 0.15 * coalesce(similarity(p.content_text, q), 0)
        -- title match ~10%
        + 0.10 * case when p.title ilike '%' || q || '%' then 1 else 0 end
        -- freshness ~3%
        + 0.03 * coalesce(1 - extract(epoch from (now() - coalesce(p.published_at, now() - interval '999 days'))) / (86400 * 30), 0)
      ) as score,
      c.name as corner_name
    from published p
    left join article_corners ac on ac.article_id = p.id
    left join corners c on c.id = ac.corner_id
  )
  select distinct on (id) id, slug, title, dek, reading_time_seconds, published_at, corner_name, score
  from scored
  where score > 0.02
  order by id, score desc
  limit lim
$$;

grant execute on function search_articles(text, int) to anon, authenticated;
