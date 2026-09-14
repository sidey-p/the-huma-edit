-- ============================================================
-- THE HUMAN EDIT — Migration 2: social + premium + admin powers
-- Run AFTER schema.sql + seed.sql.
-- ============================================================

-- ---------- public reader identity (username + avatar on profile) ----------
alter table profiles
  add column if not exists avatar_base64 text;

-- ---------- §comments: threaded discussion ----------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_pinned boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_by_article on comments (article_id, created_at);
alter table comments enable row level security;
create policy "comments public read" on comments for select using (not is_hidden);
create policy "comments author write" on comments for insert with check (user_id = auth.uid() and char_length(body) >= 1);
create policy "comments self edit" on comments for update using (user_id = auth.uid());
create policy "comments self delete" on comments for delete using (user_id = auth.uid());
create policy "comments admin moderate" on comments for update using (has_role('editor'));

-- ---------- §notifications ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'article', -- article | custom | offer | premium
  title text not null,
  body text,
  url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_by_user on notifications (user_id, is_read, created_at desc);
alter table notifications enable row level security;
create policy "notifications self" on notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- fan-out: new published article notifies followers of its corner
create or replace function notify_corner_followers() returns trigger security definer set search_path = public as $$
declare cid uuid; cslug text; aid uuid; atitle text;
begin
  if new.status = 'published' and (old.status is distinct from 'published') then
    select corner_id into cid from article_corners where article_id = new.id and is_primary limit 1;
    if cid is not null then
      select slug into cslug from corners where id = cid;
      select id, title into aid, atitle from articles where id = new.id;
      insert into notifications (user_id, kind, title, body, url)
      select f.user_id, 'article', 'New in ' || (select name from corners where id = cid),
             atitle, '/articles/' || new.slug
      from corner_follows f where f.corner_id = cid;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_article_published_notify on articles;
create trigger on_article_published_notify
after update on articles
for each row execute function notify_corner_followers();

-- ---------- §follow corners ----------
create table if not exists corner_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  corner_id uuid not null references corners(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, corner_id)
);
alter table corner_follows enable row level security;
create policy "follows public read" on corner_follows for select using (true);
create policy "follows self" on corner_follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- §bookmarks: save position mid-article ----------
create table if not exists article_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  position_percent numeric not null default 0,
  scroll_anchor text,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, article_id)
);
alter table article_bookmarks enable row level security;
create policy "bookmarks self" on article_bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- §ads + premium ----------
create table if not exists ad_slots (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade, -- null = global
  placement text not null default 'mid' check (placement in ('top','mid','end')),
  after_paragraph int not null default 3,
  title text,
  body text,
  cta_label text,
  cta_url text,
  kind text not null default 'premium' check (kind in ('premium','offer','house')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table ad_slots enable row level security;
create policy "ads public read" on ad_slots for select using (is_active or has_role('editor'));
create policy "ads manage" on ad_slots for all using (has_role('editor')) with check (has_role('editor'));

-- ---------- §editorial in-article links (link any article to another) ----------
create table if not exists article_links (
  id uuid primary key default gen_random_uuid(),
  from_article_id uuid not null references articles(id) on delete cascade,
  to_article_id uuid not null references articles(id) on delete cascade,
  label text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table article_links enable row level security;
create policy "links read" on article_links for select using (true);
create policy "links manage" on article_links for all using (has_role('editor')) with check (has_role('editor'));

-- ---------- §homepage composer storage (admin arranges sections) ----------
create table if not exists homepage_config (
  id uuid primary key default gen_random_uuid(),
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table homepage_config enable row level security;
create policy "homepage read" on homepage_config for select using (true);
create policy "homepage manage" on homepage_config for all using (has_role('editor')) with check (has_role('editor'));

-- ---------- stronger search: synonym expansion + topic/corner signals ----------
create or replace function search_articles(q text, lim int default 20)
returns table (id uuid, slug text, title text, dek text, reading_time_seconds int, published_at timestamptz, corner_name text, score numeric)
language plpgsql stable as $$
declare
  expanded text;
  syn record;
  matched_topics text[];
  syn_terms text;
begin
  expanded := lower(trim(q));

  -- §8.3 apply active synonyms (guarded)
  if length(trim(q)) > 0 then
    select string_agg(rep, ' ') into syn_terms
    from (
      select distinct coalesce(s.replacement, s.group_key) as rep
      from search_synonyms s
      where s.is_active and position(s.term in expanded) > 0
    ) sub;
    if syn_terms is not null then
      expanded := expanded || ' ' || syn_terms;
    end if;
  end if;

  -- topics whose name words appear in the query
  select array_agg(t.name) into matched_topics
  from topics t
  where exists (
    select 1 from regexp_split_to_table(lower(trim(q)), '\s+') w
    where lower(t.name) like '%' || w || '%' or w like '%' || lower(t.name) || '%'
  );

  return query
  with published as (
    select a.* from articles a where a.status = 'published'
  ),
  topic_match as (
    select at.article_id, count(*)::numeric as hits
    from article_topics at
    where at.topic_id in (select id from topics where name = any(coalesce(matched_topics, '{}')))
    group by at.article_id
  ),
  corner_match as (
    select ac.article_id, count(*)::numeric as hits
    from article_corners ac
    join corners c on c.id = ac.corner_id
    where position(lower(c.name) in lower(trim(q))) > 0
       or position(lower(trim(q)) in lower(c.name)) > 0
    group by ac.article_id
  ),
  boost as (
    select sb.article_id, coalesce(sb.boost, 1) as b
    from search_boosts sb
    where sb.query_pattern = trim(q) and (sb.expires_at is null or sb.expires_at > now())
  ),
  scored as (
    select p.id, p.slug, p.title, p.dek, p.reading_time_seconds, p.published_at,
      (
        0.30 * coalesce(ts_rank(to_tsvector('english', p.title || ' ' || coalesce(p.dek,'') || ' ' || p.content_text), plainto_tsquery('english', expanded)), 0)
        + 0.15 * coalesce(similarity(p.title, q), 0)
        + 0.15 * coalesce(similarity(p.content_text, q), 0)
        + 0.10 * case when p.title ilike '%' || trim(q) || '%' then 1 else 0 end
        + 0.07 * coalesce((select hits from topic_match tm where tm.article_id = p.id), 0) / 2.0
        + 0.05 * coalesce((select hits from corner_match cm where cm.article_id = p.id), 0) / 2.0
        + 0.06 * least(coalesce((select b from boost b where b.article_id = p.id), 1), 2) / 2.0
        + 0.03 * coalesce(1 - extract(epoch from (now() - coalesce(p.published_at, now() - interval '999 days'))) / (86400 * 30), 0)
      ) as score,
      coalesce((select name from corners c where c.id = (select corner_id from article_corners ac where ac.article_id = p.id and ac.is_primary limit 1)), '') as corner_name
    from published p
  )
  select distinct on (id) id, slug, title, dek, reading_time_seconds, published_at, corner_name, score
  from scored
  where score > 0.02
  order by id, score desc
  limit lim;
end;
$$;

grant execute on function search_articles(text, int) to anon, authenticated;

-- ---------- article body renderer helper: mid-article ad + link blocks ----------
-- (rendered client-side; this just ensures tables exist above)
