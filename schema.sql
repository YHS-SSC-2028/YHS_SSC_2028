
-- YHS SSC 2028: tiny one-row-per-student Snake leaderboard.
-- Public can read the current leaderboard; only the Edge Function can write.
create table if not exists public.snake_scores (
  user_id text primary key,
  display_name varchar(40) not null,
  best_score integer not null check (best_score >= 0 and best_score <= 3210),
  season_id bigint not null,
  updated_at timestamptz not null default now()
);

alter table public.snake_scores enable row level security;

drop policy if exists "Anyone can read snake leaderboard" on public.snake_scores;
create policy "Anyone can read snake leaderboard"
on public.snake_scores
for select
to anon, authenticated
using (true);

-- Atomic upsert: only one row is retained per Kinde user.
-- The score is replaced when a new 72-hour season begins; otherwise only
-- the user's best score for the current season is kept.
create or replace function public.submit_snake_score(
  p_user_id text,
  p_display_name text,
  p_score integer,
  p_season_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or length(p_user_id) < 3 or length(p_user_id) > 100 then
    raise exception 'Invalid user';
  end if;
  if p_score is null or p_score < 0 or p_score > 3210 then
    raise exception 'Invalid score';
  end if;
  if p_season_id <> floor(extract(epoch from now()) / 259200)::bigint then
    raise exception 'Wrong season';
  end if;

  insert into public.snake_scores(user_id, display_name, best_score, season_id, updated_at)
  values (
    p_user_id,
    left(regexp_replace(coalesce(p_display_name, 'Student'), '[[:cntrl:]]', '', 'g'), 40),
    p_score,
    p_season_id,
    now()
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    best_score = case
      when public.snake_scores.season_id = excluded.season_id
        then greatest(public.snake_scores.best_score, excluded.best_score)
      else excluded.best_score
    end,
    season_id = excluded.season_id,
    updated_at = now();
end;
$$;

revoke all on function public.submit_snake_score(text, text, integer, bigint) from public, anon, authenticated;
grant execute on function public.submit_snake_score(text, text, integer, bigint) to service_role;

-- No INSERT, UPDATE, or DELETE policy is intentionally provided.
