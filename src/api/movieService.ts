import { MOVIES_DATABASE } from "../data";
import { FilterState, Movie } from "../types";

export const ALL_FILTER_VALUE = "All";
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

export function getCatalogMovies(): Movie[] {
  return MOVIES_DATABASE;
}

export async function fetchCatalogMovies(): Promise<Movie[]> {
  const response = await fetch(`${API_BASE_URL}/api/movies`);
  if (!response.ok) {
    throw new Error(`Failed to fetch movies: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.movies) ? data.movies.map(normalizeMovie) : [];
}

export async function fetchCachedCatalogMovies(): Promise<Movie[]> {
  const response = await fetch("/tmdb-movies-cache.json", { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Failed to fetch cached movies: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.movies) ? data.movies.map(normalizeMovie) : [];
}

export async function searchCatalogMovies(query: string): Promise<Movie[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  const response = await fetch(`${API_BASE_URL}/api/movies/search?q=${encodeURIComponent(trimmedQuery)}`);
  if (!response.ok) {
    throw new Error(`Failed to search movies: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.movies) ? data.movies.map(normalizeMovie) : [];
}

export function normalizeGenreFilter(genre: string): string {
  return genre === "全部" ? ALL_FILTER_VALUE : genre;
}

export function parseLikesCount(likes: string): number {
  const value = parseFloat(likes);
  if (Number.isNaN(value)) return 0;
  if (likes.endsWith("万") || likes.endsWith("萬")) return value * 10000;
  if (likes.endsWith("K")) return value * 1000;
  if (likes.endsWith("M")) return value * 1000000;
  return value;
}

export function filterAndSortMovies(
  movies: Movie[],
  filters: FilterState,
  genreScores: Record<string, number>,
): Movie[] {
  const selectedGenre = normalizeGenreFilter(filters.selectedGenre);

  return movies.filter((movie) => {
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = movie.title.toLowerCase().includes(query);
      const matchesDirector = movie.director.toLowerCase().includes(query);
      const matchesCast = movie.cast.some((actor) => actor.toLowerCase().includes(query));
      if (!matchesTitle && !matchesDirector && !matchesCast) return false;
    }

    if (selectedGenre !== ALL_FILTER_VALUE && !movie.genres.includes(selectedGenre)) {
      return false;
    }

    if (movie.year < filters.yearRange[0] || movie.year > filters.yearRange[1]) {
      return false;
    }

    if (movie.rating < filters.minRating) {
      return false;
    }

    if (filters.language !== ALL_FILTER_VALUE && movie.language !== filters.language) {
      return false;
    }

    if (filters.selectedPlatform && !movie.platforms?.some((p) => p.type === filters.selectedPlatform)) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (filters.sortBy === "newest") {
      return b.year - a.year;
    }

    if (filters.sortBy === "rating") {
      return b.rating - a.rating;
    }

    const getPersonalizedScore = (movie: Movie) => {
      const basePopularity = parseLikesCount(movie.likesCount);
      const userPreferenceBoost = movie.genres.reduce(
        (score, genre) => score + (genreScores[genre] || 0),
        0,
      );

      return basePopularity + (userPreferenceBoost * 50);
    };

    return getPersonalizedScore(b) - getPersonalizedScore(a);
  });
}

export function getTrendingMovies(
  movies: Movie[],
  genreScores: Record<string, number>,
  limit = 10,
): Movie[] {
  return movies
    .map((movie, index) => {
      const genreScore = movie.genres.reduce((score, genre) => score + (genreScores[genre] || 0), 0);
      return {
        movie,
        score: (movie.trending ? 5 : 0) + genreScore,
        index,
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.movie);
}

export function findMovieById(id: string, movies: Movie[]): Movie | undefined {
  return movies.find((movie) => movie.id === id);
}

export function findMovieByTitle(title: string, movies: Movie[]): Movie | undefined {
  const lowerTitle = title.toLowerCase();
  return movies.find((movie) =>
    movie.title.toLowerCase().includes(lowerTitle) ||
    lowerTitle.includes(movie.title.toLowerCase())
  );
}

export function findContinueWatchingMovie(watchItemId: string, movies: Movie[]): Movie | undefined {
  const prefix = watchItemId.split("-")[0];
  return movies.find((movie) => movie.id.startsWith(prefix));
}

export function getSimilarMovies(movie: Movie, movies: Movie[], limit = 3): Movie[] {
  return movies
    .filter((item) => item.id !== movie.id && item.genres.some((genre) => movie.genres.includes(genre)))
    .slice(0, limit);
}
