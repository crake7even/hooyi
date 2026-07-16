export const VIBE_MESSAGE_MAX_LENGTH = 500;
export const VIBE_MOVIE_LIMIT = 60;
export const SEARCH_QUERY_MAX_LENGTH = 80;

const DEMO_BLOCKED_MOVIE_IDS = new Set(["175168", "143308", "532794", "387848"]);
const EXPLICIT_CONTENT_PATTERN = /(?:内射|乱伦|网络色情|啪啪啪|做爱一天|性幻想|情色调教)/i;

type UnknownRecord = Record<string, unknown>;

export type SanitizedWatchPlatformType =
  | "netflix"
  | "prime"
  | "disney"
  | "apple"
  | "hbo"
  | "hulu"
  | "theaters"
  | "crunchyroll"
  | "paramount";

const WATCH_PLATFORM_TYPES = new Set<SanitizedWatchPlatformType>([
  "netflix",
  "prime",
  "disney",
  "apple",
  "hbo",
  "hulu",
  "theaters",
  "crunchyroll",
  "paramount",
]);

export interface SanitizedVibeMovie {
  id: string;
  title: string;
  year: number;
  genres: string[];
  rating: number;
  duration: string;
  director: string;
  cast: string[];
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  trending: boolean;
  language: string;
  maturityRating: string;
  likesCount: string;
  platforms: Array<{ name: string; type: SanitizedWatchPlatformType; priceInfo?: string }>;
}

export interface SanitizedVibeFilters {
  searchQuery?: string;
  selectedGenre?: string;
  yearRange?: [number, number];
  minRating?: number;
  language?: string;
  sortBy?: "popular" | "newest" | "rating";
  selectedPlatform?: SanitizedWatchPlatformType | null;
}

export class ClientInputError extends Error {
  readonly statusCode = 400;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeString(value: unknown, maxLength: number, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function safeNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function safeStringArray(value: unknown, maxItems: number, maxLength: number) {
  return Array.isArray(value)
    ? value.map((item) => safeString(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function sanitizePlatforms(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((platform) => {
      const type = safeString(platform.type, 32) as SanitizedWatchPlatformType;
      return {
        name: safeString(platform.name, 80),
        type,
        priceInfo: safeString(platform.priceInfo, 80) || undefined,
      };
    })
    .filter((platform) => platform.name && WATCH_PLATFORM_TYPES.has(platform.type))
    .slice(0, 8);
}

function sanitizeMovie(value: unknown): SanitizedVibeMovie | null {
  if (!isRecord(value)) return null;

  const id = safeString(value.id, 64);
  const title = safeString(value.title, 160);
  if (!id || !title) return null;

  return {
    id,
    title,
    year: Math.round(safeNumber(value.year, 1888, 2100, new Date().getFullYear())),
    genres: safeStringArray(value.genres, 6, 40),
    rating: safeNumber(value.rating, 0, 10, 0),
    duration: safeString(value.duration, 40, "时长待更新"),
    director: safeString(value.director, 120, "导演待更新"),
    cast: safeStringArray(value.cast, 8, 100),
    synopsis: safeString(value.synopsis, 800, "简介待更新。"),
    posterUrl: safeString(value.posterUrl, 500),
    backdropUrl: safeString(value.backdropUrl, 500),
    trailerUrl: safeString(value.trailerUrl, 500),
    trending: value.trending === true,
    language: safeString(value.language, 16, "en"),
    maturityRating: safeString(value.maturityRating, 24, "PG-13"),
    likesCount: safeString(value.likesCount, 24, "0"),
    platforms: sanitizePlatforms(value.platforms),
  };
}

function sanitizeFilters(value: unknown): SanitizedVibeFilters {
  if (!isRecord(value)) return {};

  const yearRange = Array.isArray(value.yearRange) && value.yearRange.length === 2
    ? [
        Math.round(safeNumber(value.yearRange[0], 1888, 2100, 1888)),
        Math.round(safeNumber(value.yearRange[1], 1888, 2100, 2100)),
      ] as [number, number]
    : undefined;
  const sortBy = ["popular", "newest", "rating"].includes(String(value.sortBy))
    ? value.sortBy as SanitizedVibeFilters["sortBy"]
    : undefined;

  return {
    searchQuery: safeString(value.searchQuery, SEARCH_QUERY_MAX_LENGTH) || undefined,
    selectedGenre: safeString(value.selectedGenre, 40) || undefined,
    yearRange: yearRange && yearRange[0] <= yearRange[1] ? yearRange : undefined,
    minRating: typeof value.minRating === "number"
      ? safeNumber(value.minRating, 0, 10, 0)
      : undefined,
    language: safeString(value.language, 16) || undefined,
    sortBy,
    selectedPlatform: value.selectedPlatform === null
      ? null
      : WATCH_PLATFORM_TYPES.has(safeString(value.selectedPlatform, 32) as SanitizedWatchPlatformType)
        ? safeString(value.selectedPlatform, 32) as SanitizedWatchPlatformType
        : undefined,
  };
}

export function parseVibeRequestBody(body: unknown) {
  if (!isRecord(body)) {
    throw new ClientInputError("JSON body is required");
  }

  const message = safeString(body.message, VIBE_MESSAGE_MAX_LENGTH + 1);
  if (!message) {
    throw new ClientInputError("message is required");
  }
  if (message.length > VIBE_MESSAGE_MAX_LENGTH) {
    throw new ClientInputError(`message must be ${VIBE_MESSAGE_MAX_LENGTH} characters or fewer`);
  }

  const rawMovies = body.movies === undefined ? [] : body.movies;
  if (!Array.isArray(rawMovies)) {
    throw new ClientInputError("movies must be an array");
  }
  if (rawMovies.length > VIBE_MOVIE_LIMIT) {
    throw new ClientInputError(`movies must contain no more than ${VIBE_MOVIE_LIMIT} items`);
  }

  return {
    message,
    movies: rawMovies.map(sanitizeMovie).filter((movie): movie is SanitizedVibeMovie => Boolean(movie)),
    filters: sanitizeFilters(body.filters),
  };
}

export function isDemoSafeMovie(movie: { id?: unknown; title?: unknown; synopsis?: unknown; maturityRating?: unknown }) {
  const id = safeString(movie.id, 64);
  const text = `${safeString(movie.title, 200)} ${safeString(movie.synopsis, 2000)}`;
  const maturityRating = safeString(movie.maturityRating, 24).toUpperCase();
  return !DEMO_BLOCKED_MOVIE_IDS.has(id)
    && maturityRating !== "NC-17"
    && !EXPLICIT_CONTENT_PATTERN.test(text);
}

export function filterDemoSafeMovies<T extends { id?: unknown; title?: unknown; synopsis?: unknown; maturityRating?: unknown }>(
  movies: T[],
  enabled: boolean,
) {
  return enabled ? movies.filter(isDemoSafeMovie) : movies;
}

export function createFixedWindowLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    consume(key: string, now = Date.now()) {
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }

      bucket.count += 1;
      if (buckets.size > 10_000) {
        for (const [bucketKey, value] of buckets) {
          if (value.resetAt <= now) buckets.delete(bucketKey);
        }
      }

      return {
        allowed: bucket.count <= maxRequests,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - bucket.count),
        resetAt: bucket.resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    },
  };
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
