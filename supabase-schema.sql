create table if not exists public.user_watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id text not null,
  movie_title text not null,
  movie_year integer,
  poster_url text,
  genres text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create table if not exists public.user_watch_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id text not null,
  movie_title text not null,
  movie_year integer,
  poster_url text,
  genres text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create table if not exists public.user_genre_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  genre text not null,
  score numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, genre)
);

create table if not exists public.user_movie_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id text not null,
  movie_title text not null,
  action text not null check (action in ('view_detail', 'play_trailer', 'add_watchlist', 'dismiss', 'watch_platform')),
  genres text[] not null default '{}',
  weight numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.user_watchlist enable row level security;
alter table public.user_watch_history enable row level security;
alter table public.user_genre_scores enable row level security;
alter table public.user_movie_feedback enable row level security;

create policy "Users can read own watchlist"
  on public.user_watchlist for select
  using (auth.uid() = user_id);

create policy "Users can insert own watchlist"
  on public.user_watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can update own watchlist"
  on public.user_watchlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own watchlist"
  on public.user_watchlist for delete
  using (auth.uid() = user_id);

create policy "Users can read own history"
  on public.user_watch_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.user_watch_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update own history"
  on public.user_watch_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own history"
  on public.user_watch_history for delete
  using (auth.uid() = user_id);

create policy "Users can read own genre scores"
  on public.user_genre_scores for select
  using (auth.uid() = user_id);

create policy "Users can insert own genre scores"
  on public.user_genre_scores for insert
  with check (auth.uid() = user_id);

create policy "Users can update own genre scores"
  on public.user_genre_scores for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on public.user_movie_feedback for select
  using (auth.uid() = user_id);

create policy "Users can insert own feedback"
  on public.user_movie_feedback for insert
  with check (auth.uid() = user_id);
