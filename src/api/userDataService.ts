import { Movie } from "../types";
import { supabase } from "./supabaseClient";

export type MovieFeedbackAction =
  | "view_detail"
  | "play_trailer"
  | "add_watchlist"
  | "dismiss"
  | "watch_platform";

export interface UserSavedData {
  watchlistIds: string[];
  watchHistoryIds: string[];
  genreScores: Record<string, number>;
}

const emptyUserData: UserSavedData = {
  watchlistIds: [],
  watchHistoryIds: [],
  genreScores: {},
};

export async function loadUserSavedData(userId: string): Promise<UserSavedData> {
  if (!supabase) return emptyUserData;

  const [watchlistResult, historyResult, scoresResult] = await Promise.all([
    supabase.from("user_watchlist").select("movie_id").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("user_watch_history").select("movie_id").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("user_genre_scores").select("genre, score").eq("user_id", userId),
  ]);

  if (watchlistResult.error) throw watchlistResult.error;
  if (historyResult.error) throw historyResult.error;
  if (scoresResult.error) throw scoresResult.error;

  return {
    watchlistIds: (watchlistResult.data || []).map((item) => item.movie_id),
    watchHistoryIds: (historyResult.data || []).map((item) => item.movie_id),
    genreScores: Object.fromEntries((scoresResult.data || []).map((item) => [item.genre, Number(item.score) || 0])),
  };
}

export async function upsertWatchlistItem(userId: string, movie: Movie) {
  if (!supabase) return;

  const { error } = await supabase.from("user_watchlist").upsert(
    {
      user_id: userId,
      movie_id: movie.id,
      movie_title: movie.title,
      movie_year: movie.year,
      poster_url: movie.posterUrl,
      genres: movie.genres,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,movie_id" },
  );

  if (error) throw error;
}

export async function removeWatchlistItems(userId: string, movieIds: string[]) {
  if (!supabase || movieIds.length === 0) return;

  const { error } = await supabase
    .from("user_watchlist")
    .delete()
    .eq("user_id", userId)
    .in("movie_id", movieIds);

  if (error) throw error;
}

export async function upsertWatchHistoryItem(userId: string, movie: Movie) {
  if (!supabase) return;

  const { error } = await supabase.from("user_watch_history").upsert(
    {
      user_id: userId,
      movie_id: movie.id,
      movie_title: movie.title,
      movie_year: movie.year,
      poster_url: movie.posterUrl,
      genres: movie.genres,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,movie_id" },
  );

  if (error) throw error;
}

export async function removeWatchHistoryItems(userId: string, movieIds: string[]) {
  if (!supabase || movieIds.length === 0) return;

  const { error } = await supabase
    .from("user_watch_history")
    .delete()
    .eq("user_id", userId)
    .in("movie_id", movieIds);

  if (error) throw error;
}

export async function saveGenreScores(userId: string, genreScores: Record<string, number>) {
  if (!supabase) return;

  const rows = Object.entries(genreScores).map(([genre, score]) => ({
    user_id: userId,
    genre,
    score,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("user_genre_scores")
    .upsert(rows, { onConflict: "user_id,genre" });

  if (error) throw error;
}

export async function recordMovieFeedback(userId: string, movie: Movie, action: MovieFeedbackAction, weight: number) {
  if (!supabase) return;

  const { error } = await supabase.from("user_movie_feedback").insert({
    user_id: userId,
    movie_id: movie.id,
    movie_title: movie.title,
    action,
    genres: movie.genres,
    weight,
  });

  if (error) throw error;
}
