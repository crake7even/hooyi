import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs/promises";
import { ProxyAgent, setGlobalDispatcher } from "undici";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

type WatchPlatformType =
  | "netflix"
  | "prime"
  | "disney"
  | "apple"
  | "hbo"
  | "hulu"
  | "theaters"
  | "crunchyroll"
  | "paramount";

interface Movie {
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
  platforms?: Array<{
    name: string;
    type: WatchPlatformType;
    priceInfo?: string;
  }>;
}

interface TmdbMovieSummary {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  original_language?: string;
  genre_ids?: number[];
  adult?: boolean;
}

interface CacheItem<T> {
  expiresAt: number;
  value: T;
}

interface VibeRecommendation {
  rank: number;
  movieId: string;
  title: string;
  match: number;
  reason: string;
  feeling: string;
}

interface VibeResult {
  need: string;
  recommendations: VibeRecommendation[];
  tonightPick: {
    movieId: string;
    title: string;
    reason: string;
  };
}

interface VibeFilters {
  searchQuery?: string;
  selectedGenre?: string;
  yearRange?: [number, number];
  minRating?: number;
  language?: string;
  sortBy?: "popular" | "newest" | "rating";
  selectedPlatform?: WatchPlatformType | null;
}

const app = express();
const port = Number(process.env.PORT || 3001);
const tmdbBaseUrl = "https://api.themoviedb.org/3";
const tmdbImageBaseUrl = "https://image.tmdb.org/t/p";
const movieCacheFile = path.resolve(process.cwd(), "data", "tmdb-movies-cache.json");
const publicMovieCacheFile = path.resolve(process.cwd(), "public", "tmdb-movies-cache.json");
const tmdbReadToken = process.env.TMDB_READ_TOKEN;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const deepseekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const watchRegions = (process.env.TMDB_WATCH_REGIONS || process.env.TMDB_WATCH_REGION || "CN,US")
  .split(",")
  .map((region) => region.trim().toUpperCase())
  .filter(Boolean);
const apiProxyUrl = process.env.API_PROXY_URL;
const cache = new Map<string, CacheItem<unknown>>();
let movieRefreshPromise: Promise<Movie[]> | null = null;
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const legacyVibeSystemPrompt = `
# 影视推荐专家

你是一位顶级影视推荐顾问、资深影评人、观众心理分析师。

你的任务是根据用户描述的心情、状态、处境、最近经历、想获得的感受、当前需求，分析其真正的观影诉求，并直接推荐最适合的影视作品。

# 核心原则

你的目标不是推荐高分作品。

你的目标是：推荐此时此刻最适合用户观看的作品。

优先考虑：用户情绪状态、用户心理需求、用户当前人生阶段、用户想获得的感受。

不要优先考虑：豆瓣评分、IMDb评分、热门榜单、流量热度。

# 用户输入

用户会自由描述，例如：最近工作压力特别大、刚失恋、最近很迷茫、想看点爽的、什么都不想干、想找回对生活的热情、想找一部能让我哭出来的电影、最近总觉得孤独、想看点特别上头的剧。

你需要自动理解真实需求。不要要求用户按照固定格式填写。

# 需求分析规则

在内部分析用户真正需要什么。不要展示分析过程。直接输出结果。

示例：压力大 -> 放松、治愈、释放；孤独 -> 陪伴、共鸣；失恋 -> 疗愈、重建；迷茫 -> 找方向、寻找意义；焦虑 -> 安抚情绪；想爽 -> 强刺激、高节奏；想哭 -> 情绪释放；想热血 -> 激励、成长；无聊 -> 高沉浸感、高娱乐性。

# 电影与电视剧判断规则

如果用户明确提到推荐电影、想看电影、有没有电影推荐，只能推荐电影。

如果用户明确提到推荐电视剧、推荐剧、最近追什么剧，只能推荐电视剧。

如果用户没有明确说明，自动判断：需要快速获得情绪体验 -> 电影；需要长期沉浸陪伴 -> 电视剧。

# 推荐规则

必须推荐 4 部作品，不能多于 4 部，不能少于 4 部。

第一部：最符合用户当前状态。
第二部：满足同样需求，但更轻松、更容易观看。
第三部：满足同样需求，但更深刻、更有后劲。
第四部：意料之外，但极其契合用户状态。

# 推荐质量要求

不要机械推荐热门作品。不要只推荐榜单作品。

不要总是出现：肖申克的救赎、阿甘正传、星际穿越、绝命毒师、权力的游戏，除非它们真的最符合用户状态。

优先考虑：情绪价值、陪伴感、共鸣感、观影体验。

# 输出要求

只返回 JSON，不要 Markdown，不要额外解释。

必须只从用户消息里提供的 movies 数组中选择作品。每一条推荐的 movieId 必须等于 movies 中已有的 id，title 必须使用对应 movies 项的 title。不要推荐 movies 数组外的作品。

JSON 结构必须是：
{
  "need": "一句话总结用户当前最真实的观影需求",
  "recommendations": [
    {
      "rank": 1,
      "movieId": "movies 中对应作品的 id",
      "title": "作品名称",
      "match": 96,
      "reason": "重点说明为什么适合用户当前状态，不复制剧情简介，不剧透",
      "feeling": "观看后的情绪体验"
    }
  ],
  "tonightPick": {
    "movieId": "四部推荐中最适合今晚看的作品 id",
    "title": "作品名称",
    "reason": "一句话说明为什么它最适合用户当前状态"
  }
}

额外要求：不要询问用户更多问题；不要要求补充信息；自动推断合理需求；直接给出推荐结果；推荐理由必须结合用户状态；不允许复制剧情简介；不允许长篇剧透；输出语言使用自然、专业、有人味的中文。
`;

if (apiProxyUrl) {
  setGlobalDispatcher(new ProxyAgent(apiProxyUrl));
}

const vibeSystemPrompt = `
# 角色
你是一个基于真实片库数据的影视推荐系统。你不是热门榜单，也不是高分榜单；你的目标是根据用户此刻的情绪、状态、场景和筛选条件，从传入的 movies 数组里选出最适合的 4 部作品。

# 数据约束
1. 只能推荐 movies 数组中真实存在的作品。
2. movieId 必须严格等于 movies 中的 id。
3. title 必须严格等于对应 movie 的 title。
4. 不允许编造电影、平台、年份、简介、导演、演员或不存在的信息。
5. 推荐理由必须结合传入的真实字段，例如 genres、synopsis、rating、year、duration、director、cast、platforms、likesCount。

# 推荐策略
1. 先理解用户真实需求：例如放松、治愈、陪伴、释放情绪、找回动力、获得刺激、轻松下饭、深度思考、缓解焦虑。
2. 如果用户表达的是情绪需求，优先匹配情绪体验，不要只按 rating 或 trending 排。
3. 如果 filters 中有 genre、yearRange、minRating、language、selectedPlatform，必须优先遵守。
4. 如果用户输入里出现片名、演员、导演、类型、平台、年份、语言等明确偏好，必须优先考虑。
5. 不要把 movies 前几部机械当作推荐；每一部都要有不同的推荐角度。
6. 推荐理由不要复述剧情简介，不要剧透，要解释为什么它适合用户此刻。

# 排名含义
rank 1：最贴合用户当前状态。
rank 2：同样满足需求，但更轻松、更容易进入。
rank 3：同样满足需求，但更深刻或后劲更强。
rank 4：不是最显然的选择，但和用户状态有独特契合。

# 输出要求
只返回 JSON，不要 Markdown，不要额外解释。必须输出 4 条 recommendations。
JSON 结构必须是：
{
  "need": "一句话总结用户当前最真实的观影需求",
  "recommendations": [
    {
      "rank": 1,
      "movieId": "真实 movie id",
      "title": "真实 title",
      "match": 96,
      "reason": "结合用户状态和真实电影数据说明推荐理由",
      "feeling": "用户看完后可能获得的情绪体验"
    }
  ],
  "tonightPick": {
    "movieId": "4 部推荐中最适合今晚看的 movie id",
    "title": "真实 title",
    "reason": "一句话说明为什么今晚最适合它"
  }
}`;

const fallbackVideos = [
  "https://assets.mixkit.co/videos/preview/mixkit-futuristic-subway-station-with-neon-lights-43959-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-neon-light-from-a-tunnel-with-movement-41712-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-thick-fog-moving-through-forest-trees-42289-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-animation-style-of-sparks-of-light-on-a-black-background-48866-large.mp4",
];

const fallbackPosters = [
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=600&auto=format&fit=crop&q=80",
];

const fallbackBackdrops = [
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517602302552-471fe67acf66?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80",
];

const providerTypeByName: Array<[RegExp, WatchPlatformType]> = [
  [/netflix/i, "netflix"],
  [/prime|amazon/i, "prime"],
  [/disney/i, "disney"],
  [/apple/i, "apple"],
  [/max|hbo/i, "hbo"],
  [/hulu/i, "hulu"],
  [/crunchyroll/i, "crunchyroll"],
  [/paramount/i, "paramount"],
];

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin?.replace(/\/$/, "");
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0];

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

function getCached<T>(key: string): T | null {
  const cached = cache.get(key) as CacheItem<T> | undefined;
  if (!cached || cached.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

async function readMovieFileCache(): Promise<Movie[] | null> {
  try {
    const raw = await fs.readFile(movieCacheFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.movies) ? parsed.movies : null;
  } catch {
    return null;
  }
}

async function writeMovieFileCache(movies: Movie[]) {
  const payload = JSON.stringify({ updatedAt: new Date().toISOString(), movies }, null, 2);
  await fs.mkdir(path.dirname(movieCacheFile), { recursive: true });
  await fs.writeFile(movieCacheFile, payload, "utf8");
  await fs.mkdir(path.dirname(publicMovieCacheFile), { recursive: true });
  await fs.writeFile(publicMovieCacheFile, payload, "utf8");
}

async function tmdbFetch<T>(endpoint: string): Promise<T> {
  if (!tmdbReadToken) {
    throw new Error("TMDB_READ_TOKEN is not configured");
  }

  const response = await fetch(`${tmdbBaseUrl}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${tmdbReadToken}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function getGenreMap(): Promise<Record<number, string>> {
  const cached = getCached<Record<number, string>>("tmdb:genre-map");
  if (cached) return cached;

  const data = await tmdbFetch<{ genres: Array<{ id: number; name: string }> }>("/genre/movie/list?language=zh-CN");
  const genreMap = Object.fromEntries(data.genres.map((genre) => [genre.id, genre.name]));
  setCached("tmdb:genre-map", genreMap, 24 * 60 * 60 * 1000);
  return genreMap;
}

function imageUrl(pathValue: string | null | undefined, size: "w500" | "w780" | "w1280", fallback: string) {
  return pathValue ? `/api/images/tmdb/${size}${pathValue}` : fallback;
}

async function cacheTmdbImage(size: string, imagePath: string) {
  const cacheKey = `tmdb:image:${size}:${imagePath}`;
  const cached = getCached<{ contentType: string; body: Buffer }>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${tmdbImageBaseUrl}/${size}${imagePath}`);
  if (!response.ok) {
    throw new Error(`TMDB image request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const body = Buffer.from(await response.arrayBuffer());
  const value = { contentType, body };
  setCached(cacheKey, value, 24 * 60 * 60 * 1000);
  return value;
}

function warmMovieImages(movies: Movie[]) {
  const imageRequests = movies.slice(0, 16).flatMap((movie) => [movie.posterUrl, movie.backdropUrl]);

  for (const url of imageRequests) {
    const match = url.match(/^\/api\/images\/tmdb\/(w500|w780|w1280)(\/.+)$/);
    if (match) {
      void cacheTmdbImage(match[1], match[2]).catch(() => undefined);
    }
  }
}

function fallbackById(values: string[], id: number) {
  return values[Math.abs(id) % values.length];
}

function formatDuration(runtime?: number) {
  if (!runtime || runtime <= 0) return "时长待更新";
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  if (!hours) return `${minutes}分钟`;
  return `${hours}小时 ${minutes}分钟`;
}

function formatLikes(voteCount?: number) {
  if (!voteCount || voteCount <= 0) return "0";
  if (voteCount >= 10000) return `${(voteCount / 10000).toFixed(1)}万`;
  if (voteCount >= 1000) return `${(voteCount / 1000).toFixed(1)}K`;
  return String(voteCount);
}

function providerType(name: string): WatchPlatformType {
  return providerTypeByName.find(([pattern]) => pattern.test(name))?.[1] || "theaters";
}

function getRegionProviders(providerData: any) {
  for (const region of watchRegions) {
    const regionData = providerData?.results?.[region];
    const hasProviders = Boolean(
      regionData?.flatrate?.length ||
      regionData?.rent?.length ||
      regionData?.buy?.length,
    );

    if (hasProviders) {
      return { region, regionData };
    }
  }

  return { region: watchRegions[0] || "CN", regionData: null };
}

function normalizeProviders(providerData: any): Movie["platforms"] {
  const { region, regionData } = getRegionProviders(providerData);
  if (!regionData) return [];

  const groups = [
    { key: "flatrate", label: "订阅可看" },
    { key: "rent", label: "租赁" },
    { key: "buy", label: "购买" },
  ];
  const seen = new Set<string>();
  const platforms: Movie["platforms"] = [];

  for (const group of groups) {
    for (const provider of regionData[group.key] || []) {
      if (!provider?.provider_name || seen.has(provider.provider_name)) continue;
      seen.add(provider.provider_name);
      platforms.push({
        name: provider.provider_name,
        type: providerType(provider.provider_name),
        priceInfo: `${region} ${group.label}`,
      });
    }
  }

  return platforms.slice(0, 5);
}

async function enrichMovie(summary: TmdbMovieSummary, genreMap: Record<number, string>, trendingIds: Set<number>): Promise<Movie> {
  let details: any = null;

  try {
    details = await tmdbFetch<any>(
      `/movie/${summary.id}?language=zh-CN&append_to_response=credits,watch/providers`,
    );
  } catch {
    details = {};
  }

  const crew = details.credits?.crew || [];
  const cast = details.credits?.cast || [];
  const director = crew.find((person: any) => person.job === "Director")?.name || "导演待更新";
  const year = Number((summary.release_date || details.release_date || "").slice(0, 4)) || new Date().getFullYear();
  const rating = Number((summary.vote_average || details.vote_average || 0).toFixed(1));

  return {
    id: String(summary.id),
    title: summary.title || details.title || "未命名电影",
    year,
    genres: (summary.genre_ids || details.genres?.map((genre: any) => genre.id) || [])
      .map((id: number) => genreMap[id])
      .filter(Boolean)
      .slice(0, 4),
    rating,
    duration: formatDuration(details.runtime),
    director,
    cast: cast.slice(0, 4).map((person: any) => person.name).filter(Boolean),
    synopsis: summary.overview || details.overview || "简介待更新。",
    posterUrl: imageUrl(summary.poster_path || details.poster_path, "w500", fallbackById(fallbackPosters, summary.id)),
    backdropUrl: imageUrl(summary.backdrop_path || details.backdrop_path, "w1280", fallbackById(fallbackBackdrops, summary.id)),
    trailerUrl: fallbackById(fallbackVideos, summary.id),
    trending: trendingIds.has(summary.id),
    language: summary.original_language || details.original_language || "en",
    maturityRating: summary.adult || details.adult ? "R" : "PG-13",
    likesCount: formatLikes(summary.vote_count || details.vote_count),
    platforms: normalizeProviders(details["watch/providers"]),
  };
}

async function enrichMoviesInBatches(
  summaries: TmdbMovieSummary[],
  genreMap: Record<number, string>,
  trendingIds: Set<number>,
  batchSize = 12,
) {
  const movies: Movie[] = [];

  for (let index = 0; index < summaries.length; index += batchSize) {
    const batch = summaries.slice(index, index + batchSize);
    const batchMovies = await Promise.all(batch.map((movie) => enrichMovie(movie, genreMap, trendingIds)));
    movies.push(...batchMovies);
  }

  return movies;
}

function buildCacheDiscoverEndpoint(language: string, genreId: number, page: number) {
  const params = new URLSearchParams({
    language: "zh-CN",
    include_adult: "false",
    include_video: "false",
    page: String(page),
    sort_by: "popularity.desc",
    "vote_count.gte": "10",
    with_original_language: language,
    with_genres: String(genreId),
  });

  return `/discover/movie?${params.toString()}`;
}

async function refreshMoviesFromTmdb(): Promise<Movie[]> {
  const genreMap = await getGenreMap();
  const targetLanguages = ["zh", "ja", "ko", "en", "es"];
  const targetGenreIds = [35, 10749, 9648, 80, 16, 878, 28, 18, 27, 10751];
  const baseEndpoints = [
    ...[1, 2, 3].map((page) => `/trending/movie/week?language=zh-CN&page=${page}`),
    ...[1, 2, 3].map((page) => `/movie/popular?language=zh-CN&page=${page}`),
    ...[1, 2, 3].map((page) => `/movie/top_rated?language=zh-CN&page=${page}`),
    ...[1, 2].map((page) => `/movie/now_playing?language=zh-CN&page=${page}`),
  ];
  const coverageEndpoints = targetLanguages.flatMap((language) =>
    targetGenreIds.map((genreId) => buildCacheDiscoverEndpoint(language, genreId, 1))
  );
  const responses = await Promise.all(
    [...baseEndpoints, ...coverageEndpoints].map((endpoint) => tmdbFetch<{ results: TmdbMovieSummary[] }>(endpoint)),
  );
  const trending = responses[0] || { results: [] };
  const trendingIds = new Set(trending.results.map((movie) => movie.id));
  const baseSummaries = responses
    .slice(0, baseEndpoints.length)
    .flatMap((response) => response.results || [])
    .slice(0, 120);
  const coverageSummaries = responses
    .slice(baseEndpoints.length)
    .flatMap((response) => (response.results || []).slice(0, 9));
  const uniqueMovies = [...coverageSummaries, ...baseSummaries]
    .filter((movie, index, all) => all.findIndex((item) => item.id === movie.id) === index)
    .slice(0, 320);
  const movies = await enrichMoviesInBatches(uniqueMovies, genreMap, trendingIds);
  const fileCached = await readMovieFileCache();
  if (fileCached?.length && movies.length < Math.floor(fileCached.length * 0.75)) {
    setCached("tmdb:movies:v2", fileCached, 30 * 60 * 1000);
    warmMovieImages(fileCached);
    return fileCached;
  }

  setCached("tmdb:movies:v2", movies, 30 * 60 * 1000);
  await writeMovieFileCache(movies);
  warmMovieImages(movies);
  return movies;
}

function refreshMoviesInBackground() {
  if (movieRefreshPromise) return;

  movieRefreshPromise = refreshMoviesFromTmdb()
    .catch(() => null as unknown as Movie[])
    .finally(() => {
      movieRefreshPromise = null;
    });
}

async function getMoviesFromTmdb(): Promise<Movie[]> {
  const cached = getCached<Movie[]>("tmdb:movies:v2");
  if (cached) return cached;

  const fileCached = await readMovieFileCache();
  if (fileCached?.length) {
    setCached("tmdb:movies:v2", fileCached, 5 * 60 * 1000);
    refreshMoviesInBackground();
    return fileCached;
  }

  if (!movieRefreshPromise) {
    movieRefreshPromise = refreshMoviesFromTmdb().finally(() => {
      movieRefreshPromise = null;
    });
  }

  return movieRefreshPromise;
}

async function searchMoviesFromTmdb(query: string): Promise<Movie[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  const cacheKey = `tmdb:search:${normalizedQuery.toLowerCase()}:v1`;
  const cached = getCached<Movie[]>(cacheKey);
  if (cached) return cached;

  const genreMap = await getGenreMap();
  const data = await tmdbFetch<{ results: TmdbMovieSummary[] }>(
    `/search/movie?language=zh-CN&include_adult=false&page=1&query=${encodeURIComponent(normalizedQuery)}`,
  );
  const uniqueMovies = (data.results || [])
    .filter((movie, index, all) => movie?.id && all.findIndex((item) => item.id === movie.id) === index)
    .slice(0, 20);
  const movies = await Promise.all(uniqueMovies.map((movie) => enrichMovie(movie, genreMap, new Set())));

  setCached(cacheKey, movies, 30 * 60 * 1000);
  return movies;
}

interface VibeDiscoverCriteria {
  language?: string;
  genreIds: number[];
  year?: number;
  decadeStart?: number;
  decadeEnd?: number;
}

const tmdbGenreAliases: Array<{ id: number; aliases: string[] }> = [
  { id: 35, aliases: ["comedy", "\u559c\u5267", "\u641e\u7b11", "\u8f7b\u559c\u5267"] },
  { id: 28, aliases: ["action", "\u52a8\u4f5c", "\u6253\u6597"] },
  { id: 10749, aliases: ["romance", "\u7231\u60c5", "\u604b\u7231"] },
  { id: 878, aliases: ["science fiction", "sci-fi", "scifi", "\u79d1\u5e7b"] },
  { id: 27, aliases: ["horror", "\u6050\u6016"] },
  { id: 53, aliases: ["thriller", "\u60ca\u609a", "\u7d27\u5f20"] },
  { id: 9648, aliases: ["mystery", "\u60ac\u7591", "\u63a8\u7406"] },
  { id: 80, aliases: ["crime", "\u72af\u7f6a"] },
  { id: 16, aliases: ["animation", "anime", "\u52a8\u753b", "\u52a8\u6f2b"] },
  { id: 10751, aliases: ["family", "\u5bb6\u5ead", "\u4eb2\u5b50"] },
  { id: 12, aliases: ["adventure", "\u5192\u9669"] },
  { id: 18, aliases: ["drama", "\u5267\u60c5"] },
  { id: 14, aliases: ["fantasy", "\u5947\u5e7b", "\u9b54\u5e7b"] },
  { id: 36, aliases: ["history", "\u5386\u53f2"] },
  { id: 10752, aliases: ["war", "\u6218\u4e89"] },
  { id: 10402, aliases: ["music", "\u97f3\u4e50", "\u6b4c\u821e"] },
  { id: 99, aliases: ["documentary", "\u7eaa\u5f55", "\u7eaa\u5f55\u7247"] },
];

const tmdbLanguageAliases: Array<{ code: string; aliases: string[] }> = [
  { code: "zh", aliases: ["zh", "\u4e2d\u6587", "\u534e\u8bed", "\u56fd\u8bed", "\u6c49\u8bed", "\u666e\u901a\u8bdd", "\u7ca4\u8bed", "\u9999\u6e2f", "\u53f0\u6e7e", "\u4e2d\u56fd", "\u5927\u9646"] },
  { code: "ja", aliases: ["ja", "japanese", "\u65e5\u8bed", "\u65e5\u672c"] },
  { code: "ko", aliases: ["ko", "korean", "\u97e9\u8bed", "\u97e9\u56fd"] },
  { code: "en", aliases: ["en", "english", "\u82f1\u8bed", "\u82f1\u6587", "\u7f8e\u56fd", "\u82f1\u56fd"] },
  { code: "fr", aliases: ["fr", "french", "\u6cd5\u8bed", "\u6cd5\u56fd"] },
  { code: "es", aliases: ["es", "spanish", "\u897f\u73ed\u7259\u8bed"] },
  { code: "hi", aliases: ["hi", "hindi", "\u5370\u5730\u8bed", "\u5370\u5ea6"] },
];

function includesAlias(text: string, aliases: string[]) {
  return aliases.some((alias) => text.includes(alias.toLowerCase()));
}

function inferVibeGenreIds(text: string, filters: VibeFilters) {
  const selectedGenre = isActiveFilter(filters.selectedGenre) ? normalizeVibeText(filters.selectedGenre) : "";
  const searchableText = `${text} ${selectedGenre}`;

  return tmdbGenreAliases
    .filter((genre) => includesAlias(searchableText, genre.aliases))
    .map((genre) => genre.id);
}

function inferVibeLanguage(text: string, filters: VibeFilters) {
  if (isActiveFilter(filters.language)) {
    return normalizeVibeText(filters.language);
  }

  return tmdbLanguageAliases.find((language) => includesAlias(text, language.aliases))?.code;
}

function inferVibeYearCriteria(text: string): Pick<VibeDiscoverCriteria, "year" | "decadeStart" | "decadeEnd"> {
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return { year: Number(yearMatch[1]) };
  }

  const decadeMatch = text.match(/\b(19\d|20\d)0s\b/);
  if (decadeMatch) {
    const start = Number(`${decadeMatch[1]}0`);
    return { decadeStart: start, decadeEnd: start + 9 };
  }

  if (text.includes("90\u5e74\u4ee3") || text.includes("\u4e5d\u5341\u5e74\u4ee3")) {
    return { decadeStart: 1990, decadeEnd: 1999 };
  }

  if (text.includes("80\u5e74\u4ee3") || text.includes("\u516b\u5341\u5e74\u4ee3")) {
    return { decadeStart: 1980, decadeEnd: 1989 };
  }

  return {};
}

function buildVibeDiscoverCriteria(message: string, filters: VibeFilters): VibeDiscoverCriteria | null {
  const text = normalizeVibeText(`${message} ${filters.searchQuery || ""}`);
  const genreIds = Array.from(new Set(inferVibeGenreIds(text, filters)));
  const language = inferVibeLanguage(text, filters);
  const yearCriteria = inferVibeYearCriteria(text);
  const hasExplicitCriteria = Boolean(language || genreIds.length || yearCriteria.year || yearCriteria.decadeStart);

  if (!hasExplicitCriteria) return null;

  return {
    language,
    genreIds,
    ...yearCriteria,
  };
}

function mergeMoviesById(primary: Movie[], secondary: Movie[]) {
  const movieMap = new Map<string, Movie>();
  for (const movie of [...primary, ...secondary]) {
    movieMap.set(movie.id, movie);
  }
  return Array.from(movieMap.values());
}

function pickRecommendedMovies(movies: Movie[], recommendations: VibeRecommendation[], tonightPick?: VibeResult["tonightPick"]) {
  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const movieByTitle = new Map(movies.map((movie) => [movie.title.trim().toLowerCase(), movie]));
  const selectedMovies = new Map<string, Movie>();

  for (const item of recommendations) {
    const movie = movieById.get(item.movieId) || movieByTitle.get(item.title.trim().toLowerCase());
    if (movie) selectedMovies.set(movie.id, movie);
  }

  if (tonightPick) {
    const movie = movieById.get(tonightPick.movieId) || movieByTitle.get(tonightPick.title.trim().toLowerCase());
    if (movie) selectedMovies.set(movie.id, movie);
  }

  return Array.from(selectedMovies.values());
}

const allFilterValues = new Set(["", "all", "全部", "鍏ㄩ儴"]);

const vibeKeywordGroups = [
  {
    keywords: ["放松", "轻松", "治愈", "温暖", "开心", "下饭", "不用动脑", "relax", "comfort"],
    terms: ["喜剧", "家庭", "动画", "冒险", "comedy", "family", "animation", "adventure", "温暖", "幽默"],
  },
  {
    keywords: ["压力", "焦虑", "累", "疲惫", "崩溃", "烦", "stress", "anxiety"],
    terms: ["喜剧", "动画", "家庭", "音乐", "comedy", "animation", "family", "music", "治愈", "希望"],
  },
  {
    keywords: ["失恋", "难过", "想哭", "孤独", "emo", "sad", "cry", "lonely"],
    terms: ["剧情", "爱情", "音乐", "drama", "romance", "music", "情感", "成长"],
  },
  {
    keywords: ["热血", "动力", "迷茫", "振作", "成长", "励志", "motivation"],
    terms: ["冒险", "动作", "剧情", "历史", "adventure", "action", "drama", "history", "成长", "胜利"],
  },
  {
    keywords: ["刺激", "爽", "紧张", "悬疑", "犯罪", "thrill", "exciting"],
    terms: ["动作", "惊悚", "犯罪", "悬疑", "科幻", "action", "thriller", "crime", "mystery", "science fiction"],
  },
  {
    keywords: ["思考", "深刻", "后劲", "哲学", "人生", "meaning"],
    terms: ["剧情", "科幻", "历史", "战争", "drama", "science fiction", "history", "war", "人性"],
  },
];

function normalizeVibeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isActiveFilter(value: unknown) {
  return !allFilterValues.has(normalizeVibeText(value));
}

function parsePopularityCount(value: string) {
  const numericValue = Number.parseFloat(value);
  if (Number.isNaN(numericValue)) return 0;
  if (value.endsWith("万") || value.endsWith("萬") || value.endsWith("涓?") || value.endsWith("钀?")) {
    return numericValue * 10000;
  }
  if (value.endsWith("K")) return numericValue * 1000;
  if (value.endsWith("M")) return numericValue * 1000000;
  return numericValue;
}

function getMovieMatchText(movie: Movie) {
  return [
    movie.title,
    movie.genres.join(" "),
    movie.director,
    movie.cast.join(" "),
    movie.synopsis,
    movie.language,
    movie.platforms?.map((platform) => `${platform.name} ${platform.type}`).join(" ") || "",
  ].join(" ").toLowerCase();
}

function countTermMatches(text: string, terms: string[]) {
  return terms.reduce((count, term) => count + (text.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function scoreFallbackMovie(movie: Movie, message: string, filters: VibeFilters, index: number) {
  const messageText = normalizeVibeText(message);
  const movieText = getMovieMatchText(movie);
  let score = movie.rating * 8 + Math.min(parsePopularityCount(movie.likesCount) / 1000, 18);

  if (movie.trending) score += 6;

  if (isActiveFilter(filters.selectedGenre)) {
    const selectedGenre = normalizeVibeText(filters.selectedGenre);
    score += movie.genres.some((genre) => normalizeVibeText(genre) === selectedGenre) ? 34 : -45;
  }

  if (Array.isArray(filters.yearRange) && filters.yearRange.length === 2) {
    const [minYear, maxYear] = filters.yearRange;
    score += movie.year >= minYear && movie.year <= maxYear ? 8 : -35;
  }

  if (typeof filters.minRating === "number" && filters.minRating > 0) {
    score += movie.rating >= filters.minRating ? 8 : -28;
  }

  if (isActiveFilter(filters.language)) {
    score += normalizeVibeText(movie.language) === normalizeVibeText(filters.language) ? 8 : -14;
  }

  if (filters.selectedPlatform) {
    const hasPlatform = movie.platforms?.some((platform) => platform.type === filters.selectedPlatform);
    score += hasPlatform ? 18 : -30;
  }

  if (isActiveFilter(filters.searchQuery)) {
    score += movieText.includes(normalizeVibeText(filters.searchQuery)) ? 28 : -12;
  }

  for (const group of vibeKeywordGroups) {
    if (group.keywords.some((keyword) => messageText.includes(keyword))) {
      score += countTermMatches(movieText, group.terms) * 9;
    }
  }

  const messageTokens = messageText
    .split(/[\s,，。.!！？、;；:："'“”‘’()（）[\]{}]+/)
    .filter((token) => token.length >= 2);
  score += Math.min(messageTokens.filter((token) => movieText.includes(token)).length * 6, 24);

  return score - index * 0.08;
}

function inferFallbackNeed(message: string) {
  const messageText = normalizeVibeText(message);
  if (["放松", "轻松", "治愈", "压力", "焦虑", "累"].some((keyword) => messageText.includes(keyword))) {
    return "你现在需要一部能降低负担、让情绪慢慢松下来的作品。";
  }
  if (["失恋", "难过", "想哭", "孤独", "emo"].some((keyword) => messageText.includes(keyword))) {
    return "你现在需要一部能接住情绪、提供陪伴感的作品。";
  }
  if (["热血", "动力", "迷茫", "振作", "成长"].some((keyword) => messageText.includes(keyword))) {
    return "你现在需要一部能重新点燃行动力和方向感的作品。";
  }
  if (["刺激", "爽", "紧张", "悬疑", "犯罪"].some((keyword) => messageText.includes(keyword))) {
    return "你现在需要一部节奏更强、能迅速把注意力拉进去的作品。";
  }
  return "你现在需要一部真正贴合当下状态、而不是只按热度挑选的作品。";
}

function createFallbackRecommendations(
  movies: Movie[],
  message: string,
  filters: VibeFilters,
  usedIds = new Set<string>(),
  rankOffset = 0,
) {
  return movies
    .map((movie, index) => ({
      movie,
      score: scoreFallbackMovie(movie, message, filters, index),
    }))
    .filter(({ movie }) => !usedIds.has(movie.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, 4 - rankOffset))
    .map(({ movie, score }, index) => ({
      rank: rankOffset + index + 1,
      movieId: movie.id,
      title: movie.title,
      match: Math.max(72, Math.min(92, Math.round(score))),
      reason: `基于你的描述和当前真实片库数据，这部作品在类型、简介、评分、年份和观看平台等字段上更贴近你的需求。`,
      feeling: "获得一段更贴近当下情绪、也更容易进入的观影体验。",
    }));
}

function movieMatchesGenreId(movie: Movie, genreId: number) {
  const genre = tmdbGenreAliases.find((item) => item.id === genreId);
  if (!genre) return false;
  const movieGenres = movie.genres.map((item) => normalizeVibeText(item));
  return genre.aliases.some((alias) => movieGenres.some((movieGenre) => movieGenre.includes(alias.toLowerCase())));
}

function movieMatchesCriteria(movie: Movie, criteria: VibeDiscoverCriteria | null) {
  if (!criteria) return true;

  if (criteria.language && normalizeVibeText(movie.language) !== normalizeVibeText(criteria.language)) {
    return false;
  }

  if (criteria.genreIds.length && !criteria.genreIds.some((genreId) => movieMatchesGenreId(movie, genreId))) {
    return false;
  }

  if (criteria.year && movie.year !== criteria.year) {
    return false;
  }

  if (criteria.decadeStart && criteria.decadeEnd && (movie.year < criteria.decadeStart || movie.year > criteria.decadeEnd)) {
    return false;
  }

  return true;
}

function movieMatchesFilters(movie: Movie, filters: VibeFilters) {
  if (isActiveFilter(filters.selectedGenre)) {
    const selectedGenre = normalizeVibeText(filters.selectedGenre);
    if (!movie.genres.some((genre) => normalizeVibeText(genre) === selectedGenre || normalizeVibeText(genre).includes(selectedGenre))) {
      return false;
    }
  }

  if (Array.isArray(filters.yearRange) && filters.yearRange.length === 2) {
    const [minYear, maxYear] = filters.yearRange;
    if (movie.year < minYear || movie.year > maxYear) return false;
  }

  if (typeof filters.minRating === "number" && filters.minRating > 0 && movie.rating < filters.minRating) {
    return false;
  }

  if (isActiveFilter(filters.language) && normalizeVibeText(movie.language) !== normalizeVibeText(filters.language)) {
    return false;
  }

  if (filters.selectedPlatform && !movie.platforms?.some((platform) => platform.type === filters.selectedPlatform)) {
    return false;
  }

  return true;
}

function rankVibeMovies(movies: Movie[], message: string, filters: VibeFilters) {
  return movies
    .map((movie, index) => ({
      movie,
      score: scoreFallbackMovie(movie, message, filters, index),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.movie);
}

function selectVibeCandidateMovies(pool: Movie[], message: string, filters: VibeFilters, limit = 80) {
  const criteria = buildVibeDiscoverCriteria(message, filters);
  const strictMatches = pool.filter((movie) => movieMatchesCriteria(movie, criteria) && movieMatchesFilters(movie, filters));

  if (strictMatches.length >= 8) {
    return rankVibeMovies(strictMatches, message, filters).slice(0, limit);
  }

  const relaxedMatches = rankVibeMovies(
    pool.filter((movie) => movieMatchesFilters(movie, filters)),
    message,
    filters,
  );
  const selected = new Map<string, Movie>();

  for (const movie of rankVibeMovies(strictMatches, message, filters)) {
    selected.set(movie.id, movie);
  }

  for (const movie of relaxedMatches) {
    if (selected.size >= limit) break;
    selected.set(movie.id, movie);
  }

  if (selected.size < Math.min(limit, pool.length)) {
    for (const movie of rankVibeMovies(pool, message, filters)) {
      if (selected.size >= limit) break;
      selected.set(movie.id, movie);
    }
  }

  return Array.from(selected.values());
}

function parseVibeJson(content: string, movies: Movie[], message: string, filters: VibeFilters) {
  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const movieByTitle = new Map(movies.map((movie) => [movie.title.trim().toLowerCase(), movie]));

  try {
    const parsed = JSON.parse(content) as Partial<VibeResult>;
    const parsedRecommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
        .map((item) => {
          const requestedId = String(item?.movieId || "");
          const requestedTitle = String(item?.title || "").trim().toLowerCase();
          const matchedMovie = movieById.get(requestedId) || movieByTitle.get(requestedTitle);
          if (!matchedMovie) return null;

          return {
            movieId: matchedMovie.id,
            title: matchedMovie.title,
            match: Math.max(0, Math.min(100, Number(item?.match || 0))),
            reason: String(item?.reason || "这部作品和你此刻的状态比较贴合。"),
            feeling: String(item?.feeling || "更清楚地感受到自己此刻真正需要什么。"),
          };
        })
        .filter((item): item is Omit<VibeRecommendation, "rank"> => Boolean(item))
        .slice(0, 4)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }))
      : [];
    const usedIds = new Set(parsedRecommendations.map((item) => item.movieId));
    const fallbackRecommendations = movies
      .filter((movie) => !usedIds.has(movie.id))
      .slice(0, Math.max(0, 4 - parsedRecommendations.length))
      .map((movie, index) => ({
        rank: parsedRecommendations.length + index + 1,
        movieId: movie.id,
        title: movie.title,
        match: Math.max(70, 88 - index * 3),
        reason: "这部作品来自当前站内片库，适合作为此刻 VIBE 推荐的补充选择。",
        feeling: "获得一段更容易进入、也更贴近当下情绪的观影体验。",
      }));
    const sortedFallbackRecommendations = createFallbackRecommendations(
      movies,
      message,
      filters,
      usedIds,
      parsedRecommendations.length,
    );
    const recommendations = [...parsedRecommendations, ...sortedFallbackRecommendations].slice(0, 4);
    const requestedPickId = String(parsed.tonightPick?.movieId || "");
    const requestedPickTitle = String(parsed.tonightPick?.title || "").trim().toLowerCase();
    const matchedPick = recommendations.find((item) => item.movieId === requestedPickId) ||
      recommendations.find((item) => item.title.trim().toLowerCase() === requestedPickTitle) ||
      recommendations[0];

    const tonightPick = {
        movieId: matchedPick?.movieId || "",
        title: matchedPick?.title || "第一部推荐",
        reason: String(parsed.tonightPick?.reason || "它最能承接你此刻的情绪需求。"),
    };

    return {
      need: String(parsed.need || "你现在需要一部真正贴合当下状态的作品。"),
      movies: pickRecommendedMovies(movies, recommendations, tonightPick),
      recommendations,
      tonightPick,
    };
  } catch {
    const fallbackRecommendations = createFallbackRecommendations(movies, message, filters);
    const fallbackPick = fallbackRecommendations[0];
    const tonightPick = {
      movieId: fallbackPick?.movieId || "",
      title: fallbackPick?.title || "VIBE 推荐",
      reason: "它是当前片库中和你的描述、筛选条件最接近的一部。",
    };

    return {
      need: inferFallbackNeed(message),
      movies: pickRecommendedMovies(movies, fallbackRecommendations, tonightPick),
      recommendations: fallbackRecommendations,
      tonightPick,
    };
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/images/tmdb/:size/*", async (req, res) => {
  try {
    const size = String(req.params.size || "");
    const imagePath = `/${String(req.params[0] || "").replace(/^\/+/, "")}`;

    if (!["w500", "w780", "w1280"].includes(size) || imagePath.length <= 1 || imagePath.includes("..")) {
      res.status(400).json({ error: "Invalid TMDB image path" });
      return;
    }

    const { contentType, body } = await cacheTmdbImage(size, imagePath);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.send(body);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to load TMDB image",
    });
  }
});

app.get("/api/movies", async (_req, res) => {
  try {
    const movies = await getMoviesFromTmdb();
    res.json({ movies, source: "tmdb" });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to load TMDB movies",
    });
  }
});

app.get("/api/movies/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2) {
      res.json({ movies: [], source: "tmdb-search" });
      return;
    }

    const movies = await searchMoviesFromTmdb(query);
    res.json({ movies, source: "tmdb-search" });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to search TMDB movies",
    });
  }
});

app.post("/api/vibe", async (req, res) => {
  try {
    if (!deepseekApiKey) {
      res.status(500).json({ error: "DEEPSEEK_API_KEY is not configured" });
      return;
    }

    const message = String(req.body?.message || "").trim();
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const requestMovies = Array.isArray(req.body?.movies) ? req.body.movies.slice(0, 60) : [];
    const filters = (req.body?.filters || {}) as VibeFilters;
    const cachedMovies = await getMoviesFromTmdb().catch(() => [] as Movie[]);
    const moviePool = mergeMoviesById(cachedMovies, requestMovies);
    const movies = selectVibeCandidateMovies(moviePool, message, filters, 80);
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: deepseekModel,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: vibeSystemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify({
              userFeeling: message,
              filters,
              dataRule: "只基于 movies 数组中的真实数据推荐。filters 是用户当前页面筛选条件，必须优先遵守；如果某部作品不满足明确筛选条件，不要推荐。",
              note: "可参考 movies 中的站内真实 TMDB 片单，但最终推荐以用户当下状态最适合为准。",
              movies: movies.map((movie: Movie) => ({
                id: movie.id,
                title: movie.title,
                year: movie.year,
                genres: movie.genres,
                rating: movie.rating,
                duration: movie.duration,
                director: movie.director,
                cast: movie.cast,
                language: movie.language,
                maturityRating: movie.maturityRating,
                likesCount: movie.likesCount,
                platforms: movie.platforms || [],
                synopsis: movie.synopsis,
              })),
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `DeepSeek request failed: ${response.status}` });
      return;
    }

    const data = await response.json() as any;
    const content = data?.choices?.[0]?.message?.content || "{}";
    res.json(parseVibeJson(content, movies, message, filters));
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to call DeepSeek",
    });
  }
});

app.listen(port, () => {
  console.log(`Hooyi API server listening on http://localhost:${port}`);
});
