import { FilterState, Movie } from "../types";

const API_BASE_URL = (((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || "http://localhost:3001").replace(/\/$/, "");
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

function normalizeMovieAssetUrl(url: string): string {
  const tmdbImageMatch = url.match(/^\/api\/images\/tmdb\/(w500|w780|w1280)(\/.+)$/);
  if (tmdbImageMatch) {
    return `${TMDB_IMAGE_BASE_URL}/${tmdbImageMatch[1]}${tmdbImageMatch[2]}`;
  }

  return url.startsWith("/api/") ? `${API_BASE_URL}${url}` : url;
}

function normalizeMovie(movie: Movie): Movie {
  return {
    ...movie,
    posterUrl: normalizeMovieAssetUrl(movie.posterUrl),
    backdropUrl: normalizeMovieAssetUrl(movie.backdropUrl),
  };
}

export interface VibeResponse {
  need?: string;
  movies?: Movie[];
  recommendations?: Array<{
    rank: number;
    movieId: string;
    title: string;
    match: number;
    reason: string;
    feeling: string;
  }>;
  tonightPick?: {
    movieId: string;
    title: string;
    reason: string;
  };
  error?: string;
}

export async function requestVibeRecommendation(
  message: string,
  movies: Movie[],
  filters: FilterState,
): Promise<VibeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/vibe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      movies: movies.slice(0, 60),
      filters,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `VIBE request failed: ${response.status}`);
  }

  return {
    ...data,
    movies: Array.isArray(data?.movies) ? data.movies.map(normalizeMovie) : data?.movies,
  };
}
