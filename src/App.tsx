import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Sun, Moon, Mail } from "lucide-react";
import SidebarComponent, { SearchBox } from "./components/Sidebar";
import FilterPanel, { FilterToggleButton, countActiveFilters } from "./components/FilterPanel";
import HeroSection from "./components/HeroSection";
import MovieSlider from "./components/MovieSlider";
import TinderSwipeDeck from "./components/TinderSwipeDeck";
import VibePrompt from "./components/VibePrompt";
import ListManagementView from "./components/ListManagementView";
import MovieDetailModal from "./components/MovieDetailModal";
import DataAttribution from "./components/DataAttribution";
import { FilterState, Movie, WatchPlatformType } from "./types";
import {
  ALL_FILTER_VALUE,
  filterAndSortMovies,
  findMovieById,
  fetchCachedCatalogMovies,
  fetchCatalogMovies,
  getCatalogMovies,
  getSimilarMovies,
  getTrendingMovies,
  searchCatalogMovies,
} from "./api/movieService";
import {
  loadUserSavedData,
  removeWatchHistoryItems,
  removeWatchlistItems,
  saveGenreScores,
  upsertWatchHistoryItem,
  upsertWatchlistItem,
} from "./api/userDataService";

type LoadingPhase = "connecting" | "preloading" | "ready";

// Memoized so swipe-deck interactions do not re-render the sidebar unless its own data changes.
const Sidebar = React.memo(SidebarComponent);

const hasWatchProviders = (movie: Movie) => Boolean(movie.platforms?.length);

const mergeMoviesById = (baseMovies: Movie[], incomingMovies: Movie[]) => {
  const movieMap = new Map(baseMovies.map((movie) => [movie.id, movie]));
  for (const movie of incomingMovies) {
    movieMap.set(movie.id, movie);
  }
  return Array.from(movieMap.values());
};

const isChineseMovie = (movie: Movie) => movie.language === "zh";

const rotateBySeed = <T,>(items: T[], seed: number) => {
  if (items.length <= 1) return items;
  const offset = Math.floor(seed * items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
};

const buildFocusMovies = (rankedMovies: Movie[], seed: number, limit = 10) => {
  const chineseMovies = rankedMovies.filter(isChineseMovie);
  const foreignMovies = rankedMovies.filter((movie) => !isChineseMovie(movie));
  const firstChinesePool = chineseMovies.slice(0, Math.min(chineseMovies.length, 20));
  const firstMovie = firstChinesePool[Math.floor(seed * firstChinesePool.length) % firstChinesePool.length] || chineseMovies[0];
  const selected = new Map<string, Movie>();
  const countSelectedChinese = () => Array.from(selected.values()).filter(isChineseMovie).length;
  const countSelectedForeign = () => Array.from(selected.values()).filter((movie) => !isChineseMovie(movie)).length;

  if (firstMovie) {
    selected.set(firstMovie.id, firstMovie);
  }

  const rotatedChineseMovies = rotateBySeed(chineseMovies.filter((movie) => movie.id !== firstMovie?.id), seed * 0.73 + 0.11);
  const rotatedForeignMovies = rotateBySeed(foreignMovies, seed * 0.41 + 0.37);
  const targetChineseCount = Math.min(7, limit);
  const targetForeignCount = Math.max(0, limit - targetChineseCount);

  for (const movie of rotatedChineseMovies) {
    if (countSelectedChinese() >= targetChineseCount) break;
    selected.set(movie.id, movie);
  }

  for (const movie of rotatedForeignMovies) {
    if (countSelectedForeign() >= targetForeignCount) break;
    selected.set(movie.id, movie);
  }

  for (const movie of rankedMovies) {
    if (selected.size >= limit) break;
    selected.set(movie.id, movie);
  }

  return Array.from(selected.values()).slice(0, limit);
};

const readStoredMovieIds = (storageKey: string): string[] => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && typeof item.id === "string") return item.id;
        return null;
      })
      .filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
};

const readStoredGenreScores = (): Record<string, number> => {
  try {
    const saved = localStorage.getItem("movieApp_genres");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const mergeUniqueIds = (primary: string[], secondary: string[]) => {
  return Array.from(new Set([...primary, ...secondary]));
};

function LoadingScreen({
  phase,
  error,
  onRetry,
}: {
  phase: LoadingPhase;
  error: string | null;
  onRetry: () => void;
}) {
  const statusText = error ? "暂时没有加载完成" : "请稍后";
  const descriptionText = error
    ? "好影暂时没有准备好今晚的内容。"
    : "好影正在整理今晚值得看的内容";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#edf2ff] text-[#18213f] flex items-center justify-center px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,132,93,0.28),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(74,111,197,0.24),transparent_30%),linear-gradient(145deg,#f8fbff_0%,#dce7ff_48%,#f4d9ea_100%)]" />
      <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(24,33,63,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(24,33,63,0.1)_1px,transparent_1px)] [background-size:42px_42px]" />

      <section className="relative w-full max-w-xl rounded-[32px] border border-white/70 bg-white/35 px-7 py-8 md:px-10 md:py-10 shadow-[0_28px_90px_rgba(70,85,140,0.22)] backdrop-blur-2xl text-left">
        <div className="mb-8 flex items-center justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase text-[#e86f55] tracking-[0.24em]">Hooyi</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-serif font-black leading-none text-[#141b34]">
              好影
            </h1>
          </div>
          <div className="relative h-20 w-20 shrink-0">
            <div className="absolute inset-0 rounded-[24px] bg-[#141b34] rotate-6 shadow-2xl" />
            <div className="absolute inset-2 rounded-[20px] bg-[#ff765e] -rotate-6" />
            <div className="absolute inset-x-6 inset-y-4 rounded-full border-4 border-white/80" />
          </div>
        </div>

        <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#141b34]/10">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#ff765e] via-[#ffd36e] to-[#4f6fd4] animate-[pulse_1.2s_ease-in-out_infinite]" />
        </div>

        <p className="text-lg md:text-xl font-black text-[#141b34]">{statusText}</p>
        <p className="mt-3 text-sm leading-relaxed text-[#36405f]/80">
          {descriptionText}
        </p>
        {!error && (
          <p className="mt-2 text-xs font-semibold text-[#5a6687]/70">
            首次进入加载时间较长
          </p>
        )}

        {error && (
          <button
            onClick={onRetry}
            className="mt-6 rounded-full bg-[#141b34] px-6 py-3 text-sm font-black text-white shadow-xl shadow-[#141b34]/20 transition-all hover:bg-[#243154] active:scale-[0.98]"
          >
            再试一次
          </button>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const focusSeedRef = useRef(Math.random());
  const [catalogMovies, setCatalogMovies] = useState<Movie[]>(() => getCatalogMovies());
  const [searchResultMovies, setSearchResultMovies] = useState<Movie[]>([]);
  const [, setCatalogSyncError] = useState<string | null>(null);
  const currentUser = useMemo<{ id: string; email?: string } | null>(() => null, []);
  const loadedUserDataRef = useRef<string | null>(null);
  const setUserDataStatus = (_status: string) => undefined;

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    async function loadCachedCatalog() {
      try {
        const movies = await fetchCachedCatalogMovies();
        if (!cancelled && movies.length > 0) {
          setCatalogMovies(movies);
        }
      } catch {
        // The local built-in catalog remains available if the static cache is missing.
      }
    }

    async function loadRealCatalog(attempt = 0) {
      if (attempt === 0) {
        setCatalogSyncError(null);
      }

      try {
        const movies = await fetchCatalogMovies();
        if (movies.length === 0) {
          throw new Error("Real catalog is empty");
        }

        if (!cancelled) {
          setCatalogMovies((currentMovies) => mergeMoviesById(currentMovies, movies));
          setCatalogSyncError(null);
          retryTimer = window.setTimeout(() => {
            void loadRealCatalog(attempt + 1);
          }, attempt === 0 ? 30000 : 180000);
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogSyncError(error instanceof Error ? error.message : "Failed to load real catalog");
          retryTimer = window.setTimeout(() => {
            void loadRealCatalog(attempt + 1);
          }, Math.min(3000 + attempt * 2000, 15000));
        }
      }
    }

    void loadCachedCatalog();
    void loadRealCatalog();

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, []);

  // Multidimensional Movie Filter States
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    selectedGenre: ALL_FILTER_VALUE,
    yearRange: [1950, 2026],
    minRating: 0,
    language: "All",
    sortBy: "popular",
    selectedPlatform: null,
  });

  useEffect(() => {
    const query = filters.searchQuery.trim();
    if (query.length < 2) {
      setSearchResultMovies([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchCatalogMovies(query)
        .then((movies) => {
          if (!cancelled) {
            setSearchResultMovies(movies);
          }
        })
        .catch(() => {
          // Local filtering still works if the dynamic TMDB search endpoint is unavailable.
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters.searchQuery]);

  // Controls UI widgets
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [themeMode, setThemeMode] = useState<"night" | "day">("day");
  const [swipedMovieIds, setSwipedMovieIds] = useState<string[]>([]);

  // Playback / Detail Overlay States
  const [activeDetailMovie, setActiveDetailMovie] = useState<Movie | null>(null);
  
  // Watch history & Genre Preferences (LocalStorage)
  const [watchHistoryIds, setWatchHistoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('movieApp_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [genreScores, setGenreScores] = useState<Record<string, number>>(() => {
    return readStoredGenreScores();
  });

  const watchHistoryMovies = useMemo(() => {
    return watchHistoryIds
      .map(id => findMovieById(id, catalogMovies))
      .filter((m): m is Movie => m !== undefined);
  }, [watchHistoryIds, catalogMovies]);

  const trackGenreScore = (movie: Movie, weight: number = 1, _action?: string) => {
    setGenreScores(prev => {
      const updated = { ...prev };
      for (const genre of movie.genres) {
        updated[genre] = (updated[genre] || 0) + weight;
      }
      localStorage.setItem('movieApp_genres', JSON.stringify(updated));
      return updated;
    });
  };

  const trackMovieInteraction = (movie: Movie) => {
    // Both add to watch history AND increase genre score substantially
    setWatchHistoryIds(prev => {
      const newHistory = prev.filter(id => id !== movie.id);
      newHistory.unshift(movie.id);
      const topHistory = newHistory.slice(0, 50);
      localStorage.setItem('movieApp_history', JSON.stringify(topHistory));
      return topHistory;
    });
    trackGenreScore(movie, 10, "watch_platform");
  };

  const handleOpenDetailModal = (movie: Movie | null) => {
    if (movie) {
      trackGenreScore(movie, 1, "view_detail");
    }
    setActiveDetailMovie(movie);
  };

  // Watchlist state
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => readStoredMovieIds("movieApp_watchlist"));

  const watchlist = useMemo(() => {
    return watchlistIds
      .map(id => findMovieById(id, catalogMovies))
      .filter((m): m is Movie => m !== undefined);
  }, [watchlistIds, catalogMovies]);

  useEffect(() => {
    if (!currentUser || loadedUserDataRef.current === currentUser.id) return;

    loadedUserDataRef.current = currentUser.id;
    setUserDataStatus("正在同步账号数据");

    loadUserSavedData(currentUser.id)
      .then((cloudData) => {
        const localWatchlistIds = readStoredMovieIds("movieApp_watchlist");
        const localHistoryIds = readStoredMovieIds("movieApp_history");
        const localGenreScores = readStoredGenreScores();
        const mergedWatchlistIds = mergeUniqueIds(cloudData.watchlistIds, localWatchlistIds);
        const mergedHistoryIds = mergeUniqueIds(cloudData.watchHistoryIds, localHistoryIds).slice(0, 50);
        const mergedGenreScores = {
          ...localGenreScores,
          ...cloudData.genreScores,
        };

        setWatchlistIds(mergedWatchlistIds);
        setWatchHistoryIds(mergedHistoryIds);
        setGenreScores(mergedGenreScores);
        localStorage.setItem("movieApp_watchlist", JSON.stringify(mergedWatchlistIds));
        localStorage.setItem("movieApp_history", JSON.stringify(mergedHistoryIds));
        localStorage.setItem("movieApp_genres", JSON.stringify(mergedGenreScores));

        void saveGenreScores(currentUser.id, mergedGenreScores).catch(() => undefined);
        for (const id of mergedWatchlistIds) {
          const movie = findMovieById(id, catalogMovies);
          if (movie) void upsertWatchlistItem(currentUser.id, movie).catch(() => undefined);
        }
        for (const id of mergedHistoryIds) {
          const movie = findMovieById(id, catalogMovies);
          if (movie) void upsertWatchHistoryItem(currentUser.id, movie).catch(() => undefined);
        }

        setUserDataStatus("账号数据已同步");
      })
      .catch(() => {
        loadedUserDataRef.current = null;
        setUserDataStatus("账号数据同步失败，正在使用本地数据");
      });
  }, [currentUser, catalogMovies]);

  // Snapshot taken before the latest swipe action so it can be undone exactly.
  const swipeUndoRef = useRef<{ movieId: string; genreScores: Record<string, number>; watchlistIds: string[]; swipedMovieIds: string[] } | null>(null);
  const genreScoresRef = useRef(genreScores);
  genreScoresRef.current = genreScores;
  const watchlistIdsRef = useRef(watchlistIds);
  watchlistIdsRef.current = watchlistIds;
  const swipedMovieIdsRef = useRef(swipedMovieIds);
  swipedMovieIdsRef.current = swipedMovieIds;

  const rememberSwipeSnapshot = (movie: Movie) => {
    swipeUndoRef.current = {
      movieId: movie.id,
      genreScores: genreScoresRef.current,
      watchlistIds: watchlistIdsRef.current,
      swipedMovieIds: swipedMovieIdsRef.current,
    };
  };

  const handleSwipeAddToWatchlist = (movie: Movie) => {
    rememberSwipeSnapshot(movie);
    handleAddToWatchlist(movie);
  };

  const handleUndoSwipe = (movie: Movie) => {
    const snapshot = swipeUndoRef.current;
    if (!snapshot || snapshot.movieId !== movie.id) return;
    swipeUndoRef.current = null;

    const removedFromWatchlist = !snapshot.watchlistIds.includes(movie.id) && watchlistIdsRef.current.includes(movie.id);
    setGenreScores(snapshot.genreScores);
    setWatchlistIds(snapshot.watchlistIds);
    setSwipedMovieIds(snapshot.swipedMovieIds);
    localStorage.setItem("movieApp_genres", JSON.stringify(snapshot.genreScores));
    localStorage.setItem("movieApp_watchlist", JSON.stringify(snapshot.watchlistIds));
    if (currentUser && removedFromWatchlist) {
      void removeWatchlistItems(currentUser.id, [movie.id]).catch(() => undefined);
    }
  };

  const handleAddToWatchlist = (movie: Movie) => {
    setSwipedMovieIds((prev) => prev.includes(movie.id) ? prev : [...prev, movie.id]);
    trackGenreScore(movie, 8, "add_watchlist");
    setWatchlistIds(prev => {
      if (prev.includes(movie.id)) return prev;
      const next = [movie.id, ...prev];
      localStorage.setItem('movieApp_watchlist', JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      void upsertWatchlistItem(currentUser.id, movie).catch(() => undefined);
    }
  };

  const handleDismissSwipeMovie = (movie: Movie) => {
    rememberSwipeSnapshot(movie);
    setSwipedMovieIds((prev) => prev.includes(movie.id) ? prev : [...prev, movie.id]);
    trackGenreScore(movie, -5, "dismiss");
  };

  const handleRemoveFromWatchlist = (idsToRemove: string[]) => {
    setWatchlistIds(prev => {
      const next = prev.filter(id => !idsToRemove.includes(id));
      localStorage.setItem('movieApp_watchlist', JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      void removeWatchlistItems(currentUser.id, idsToRemove).catch(() => undefined);
    }
  };

  const handleRemoveFromHistory = (idsToRemove: string[]) => {
    setWatchHistoryIds(prev => {
      const next = prev.filter(id => !idsToRemove.includes(id));
      localStorage.setItem('movieApp_history', JSON.stringify(next));
      return next;
    });
    if (currentUser) {
      void removeWatchHistoryItems(currentUser.id, idsToRemove).catch(() => undefined);
    }
  };

  // Personalized Trending Movies
  const trendMovies = useMemo(() => {
    const rankedMovies = getTrendingMovies(catalogMovies, genreScores, 80);
    return buildFocusMovies(rankedMovies, focusSeedRef.current);
  }, [catalogMovies, genreScores]);
  
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isFeaturedSwitching, setIsFeaturedSwitching] = useState(false);
  const currentFeatured = trendMovies[featuredIndex] || catalogMovies[0];

  const searchableMovies = useMemo(() => {
    return filters.searchQuery.trim().length >= 2
      ? mergeMoviesById(catalogMovies, searchResultMovies)
      : catalogMovies;
  }, [catalogMovies, filters.searchQuery, searchResultMovies]);

  // Live Filtering and Sorting logic computation
  const filteredAndSortedMovies = useMemo(() => {
    return filterAndSortMovies(searchableMovies, filters, genreScores);
  }, [searchableMovies, filters, genreScores]);

  const watchableCatalogMovies = useMemo(() => {
    return catalogMovies.filter(hasWatchProviders);
  }, [catalogMovies]);

  const [swipeRound, setSwipeRound] = useState(0);

  // Ranked once per round (and when the catalog itself changes); swipes inside a round do not reshuffle it.
  const swipeCandidateMovies = useMemo(() => {
    const genreScores = genreScoresRef.current;
    const watchlistIds = watchlistIdsRef.current;
    const swipedMovieIds = swipedMovieIdsRef.current;
    const sourceMovies = watchableCatalogMovies.length > 0 ? watchableCatalogMovies : catalogMovies;
    const baseMovies = sourceMovies.filter((movie) => !swipedMovieIds.includes(movie.id));
    const availableMovies = baseMovies.length > 0 ? baseMovies : sourceMovies;
    return [...availableMovies]
      .map((movie) => {
        const preferenceScore = movie.genres.reduce((score, genre) => score + (genreScores[genre] || 0), 0);
        const watchlistPenalty = watchlistIds.includes(movie.id) ? -30 : 0;

        return {
          movie,
          score: preferenceScore + watchlistPenalty + movie.rating * 0.5 + Math.random() * 2,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.movie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchableCatalogMovies, catalogMovies, swipeRound]);

  const vibeCandidateMovies = watchableCatalogMovies.length > 0 ? watchableCatalogMovies : catalogMovies;

  const swipeDeckResetKey = `round-${swipeRound}`;

  const activeSimilarMovies = useMemo(() => {
    return activeDetailMovie ? getSimilarMovies(activeDetailMovie, searchableMovies) : [];
  }, [activeDetailMovie, searchableMovies]);

  // Hero backdrops: decode the neighbours ahead of time so switching never waits on the network.
  const loadedBackdropsRef = useRef(new Map<string, Promise<void>>());
  const preloadBackdrop = useCallback((movie: Movie) => {
    const cache = loadedBackdropsRef.current;
    let pending = cache.get(movie.backdropUrl);
    if (!pending) {
      pending = new Promise<void>((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          void (image.decode ? image.decode().catch(() => undefined) : Promise.resolve()).then(() => resolve());
        };
        image.onerror = () => resolve();
        image.src = movie.backdropUrl;
      });
      cache.set(movie.backdropUrl, pending);
    }
    return pending;
  }, []);

  useEffect(() => {
    const total = trendMovies.length;
    if (total === 0) return;
    for (const offset of [1, -1, 2]) {
      const movie = trendMovies[(featuredIndex + offset + total) % total];
      if (movie) void preloadBackdrop(movie);
    }
  }, [trendMovies, featuredIndex, preloadBackdrop]);

  const switchFeaturedMovie = async (getNextIndex: (current: number, total: number) => number) => {
    const total = Math.max(trendMovies.length, 1);
    const nextIndex = getNextIndex(featuredIndex, total);
    const nextMovie = trendMovies[nextIndex] || catalogMovies[nextIndex] || catalogMovies[0];

    if (!nextMovie || isFeaturedSwitching) return;

    // Already decoded (the usual case): switch on this frame. Otherwise wait briefly, never more than 300ms.
    setIsFeaturedSwitching(true);
    await Promise.race([preloadBackdrop(nextMovie), new Promise((resolve) => window.setTimeout(resolve, 300))]);
    setFeaturedIndex(nextIndex);
    setIsFeaturedSwitching(false);
  };

  const handleNextFeatured = () => {
    void switchFeaturedMovie((current, total) => (current + 1) % total);
  };

  const handlePrevFeatured = () => {
    void switchFeaturedMovie((current, total) => (current - 1 + total) % total);
  };

  // Unified dynamic filters setter Helper
  const handleUpdateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);
  const handleSidebarSearch = useCallback((q: string) => handleUpdateFilters({ searchQuery: q }), [handleUpdateFilters]);
  const handleSidebarPlatform = useCallback((platform: WatchPlatformType | null) => handleUpdateFilters({ selectedPlatform: platform }), [handleUpdateFilters]);
  const handleSidebarDetails = useCallback((movie: Movie) => setActiveDetailMovie(movie), []);
  const handleSidebarFullView = useCallback((view: string) => setActiveTab(view), []);
  const handleSidebarDiscover = useCallback(() => setActiveTab("随心一刷"), []);

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      selectedGenre: ALL_FILTER_VALUE,
      yearRange: [1950, 2026],
      minRating: 0,
      language: ALL_FILTER_VALUE,
      sortBy: "popular",
      selectedPlatform: null,
    });
  };

  // Quick header menu tabs that updates filters dynamically
  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState("首页");
  const menuCategories = ["首页", "随心一刷", "Vibe"];

  const handleMenuCategoryClick = (category: string) => {
    if (category === "首页") {
      setActiveTab("首页");
      handleUpdateFilters({ selectedGenre: ALL_FILTER_VALUE });
    } else if (category === "随心一刷") {
      setActiveTab("随心一刷");
    } else if (category === "Vibe") {
      setActiveTab("Vibe");
    }
  };

  return (
    <div className={`relative min-h-screen text-white overflow-x-hidden font-sans p-4 md:p-6 fit:p-5 fit:h-svh select-none flex items-start lg:items-center justify-center`}>
      {/* Background Layers for smooth transition */}
      <div className={`fixed inset-0 bg-gradient-to-b from-[#141320] via-[#4b312b] to-[#eb711f] transition-opacity duration-1000 -z-20 ${themeMode === "night" ? "opacity-100" : "opacity-0"}`} />
      <div className={`fixed inset-0 bg-gradient-to-b from-[#32448f] via-[#8195d2] to-[#f3cae8] transition-opacity duration-1000 -z-20 ${themeMode === "day" ? "opacity-100" : "opacity-0"}`} />
      
      {/* Absolute floating cinematic decorative projection lamps */}
      <div className={`absolute top-[5%] right-[10%] w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none transition-all duration-1000 -z-10 ${
        themeMode === "night" ? "bg-[#eb711f]/15" : "bg-[#f3cae8]/30"
      }`}></div>
      <div className={`absolute top-[20%] left-[5%] w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-all duration-1000 -z-10 ${
        themeMode === "night" ? "bg-[#4b312b]/30" : "bg-[#8195d2]/20"
      }`}></div>
      <div className={`absolute bottom-[15%] right-[15%] w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none transition-all duration-1000 -z-10 ${
        themeMode === "night" ? "bg-[#eb711f]/10" : "bg-[#32448f]/20"
      }`}></div>
 
      {/* Main glass frame boundaries wrapper */}
      <div 
        className="relative w-full max-w-7xl mx-auto my-auto fit:h-full fit:my-0 flex flex-col gap-4 p-4 md:p-5 rounded-[36px] z-10 transition-all duration-1000"
        style={{
          boxShadow: themeMode === "night" 
            ? "0 30px 100px rgba(0, 0, 0, 0.3), inset 1px 1px 1.5px 0 rgba(255, 255, 255, 0.45)" 
            : "0 30px 100px rgba(150, 34, 0, 0.1), inset 1px 1px 2px 0 rgba(255, 255, 255, 0.55)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          background: themeMode === "night" 
            ? "rgba(255, 255, 255, 0.13)" 
            : "rgba(255, 255, 255, 0.16)",
          border: "1px solid rgba(255, 255, 255, 0.22)"
        }}
      >
        {/* Brand Header */}
        <div className="lg:hidden flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/[0.05] pb-4 mb-2 gap-3 relative">
          <div className="text-left">
            <h1 className="text-white font-serif font-extrabold text-3xl md:text-4xl tracking-tight leading-none">
              好影
            </h1>
            <p className={`${themeMode === "day" ? "text-white/85" : "text-white/40"} text-xs md:text-sm mt-2 leading-relaxed tracking-wide`}>
              院线与流媒体直通指南
            </p>
          </div>
          
          {/* User's uploaded custom LOGO image in the top center area removed */}
        </div>
        
        {/* Master Row Panel containing left drawer sidebar and right widescreen monitor area */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch fit:flex-1 fit:min-h-0">
          
          {/* LEFT SIDEBAR PANEL: Built dynamically with widgets */}
          <Sidebar
            searchQuery={filters.searchQuery}
            setSearchQuery={handleSidebarSearch}
            themeMode={themeMode}
            selectedPlatform={filters.selectedPlatform || null}
            onSelectPlatform={handleSidebarPlatform}
            onDetails={handleSidebarDetails}
            movies={searchableMovies}
            watchlist={watchlist}
            watchHistory={watchHistoryMovies}
            onOpenFullView={handleSidebarFullView}
            onDiscover={handleSidebarDiscover}
            brand={
              <div className="text-left">
                <h1 className="text-white font-serif font-extrabold text-3xl tracking-tight leading-none">好影</h1>
                <p className={`${themeMode === "day" ? "text-white/85" : "text-white/45"} text-[11px] mt-1.5 tracking-wide`}>院线与流媒体直通指南</p>
              </div>
            }
          />

          {/* RIGHT MAIN SHOWCASE: Wide dynamic monitor display area */}
          <main className="flex-1 w-full flex flex-col gap-5 min-w-0 min-h-[650px] lg:min-h-[750px] fit:!min-h-0 fit:overflow-y-auto fit:scrollbar-none">
            
            {/* Top Navigation Row */}
            <header className="grid grid-cols-1 lg:grid-cols-[minmax(200px,1fr)_minmax(300px,440px)_auto] items-center gap-4 py-2 lg:py-0 lg:h-[44px] relative z-30 w-full shrink-0">
              
              <div className="hidden lg:block lg:col-start-1 lg:row-start-1 lg:h-[44px] min-w-0">
                <SearchBox value={filters.searchQuery} onChange={handleSidebarSearch} />
              </div>

              {/* Category Pill Buttons */}
              <nav className="flex items-stretch gap-2 p-1 bg-white/[0.02] border border-white/[0.04] backdrop-blur-md rounded-2xl w-full overflow-hidden lg:col-start-2">
                {menuCategories.map((cat) => {
                  const isActive = activeTab === cat;

                  return (
                    <button
                      key={cat}
                      onClick={() => handleMenuCategoryClick(cat)}
                      className={`flex-1 min-h-11 py-1.5 lg:py-2 text-sm font-bold rounded-xl transition-all capitalize cursor-pointer shrink-0 text-center ${
                        isActive
                          ? "bg-white/10 text-white shadow-sm border border-white/5"
                          : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </nav>

              {/* Utility actions side elements */}
              <div className="flex items-center justify-end gap-3 w-full lg:w-auto relative z-20 lg:col-start-3">

                <FilterToggleButton
                  isOpen={isFilterPanelOpen}
                  onToggle={() => setIsFilterPanelOpen((open) => !open)}
                  activeCount={countActiveFilters(filters)}
                />

                {/* Day / Night Theme Toggle */}
                <button
                  onClick={() => setThemeMode(themeMode === "night" ? "day" : "night")}
                  className="h-11 w-11 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] text-white/80 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
                  title={themeMode === "night" ? "Switch to Day Mode" : "Switch to Night Mode"}
                  aria-label={themeMode === "night" ? "Switch to Day Mode" : "Switch to Night Mode"}
                >
                  <div className="relative w-4 h-4 flex items-center justify-center">
                    {/* Sun Icon */}
                    <Sun 
                      size={15} 
                      className={`absolute transition-all duration-500 ease-out text-[#fad055] drop-shadow-[0_0_8px_rgba(250,208,85,0.5)] ${
                        themeMode === "day" 
                          ? "scale-100 rotate-0 opacity-100" 
                          : "scale-0 rotate-90 opacity-0 pointer-events-none"
                      }`} 
                    />
                    {/* Moon Icon */}
                    <Moon 
                      size={15} 
                      className={`absolute transition-all duration-500 ease-out text-[#507be1] drop-shadow-[0_0_8px_rgba(80,123,225,0.4)] ${
                        themeMode === "night" 
                          ? "scale-100 rotate-0 opacity-100" 
                          : "scale-0 -rotate-90 opacity-0 pointer-events-none"
                      }`} 
                    />
                  </div>
                </button>

                <DataAttribution themeMode={themeMode} variant="icon" />

                {/* Profile menu drop toggle */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowProfileDropdown(!showProfileDropdown);
                    }}
                    aria-label="Contact developer"
                    aria-haspopup="true"
                    aria-expanded={showProfileDropdown}
                    className="flex h-11 w-11 items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
                  >
                    <div className="flex items-center justify-center">
                      <Mail size={17} strokeWidth={1.9} className="text-white/75" />
                    </div>
                  </button>

                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-3 z-40 w-56 p-2 rounded-2xl bg-neutral-950 border border-white/10 shadow-2xl flex flex-col gap-1 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-3 py-3 rounded-lg bg-white/[0.02] border border-white/[0.02]">
                        <p className="text-[10px] text-white/50 mb-1.5">
                          {"\u8054\u7cfb\u5f00\u53d1\u8005 / \u610f\u89c1\u53cd\u9988"}
                        </p>
                        <p className="text-xs text-white font-bold tracking-tight select-text selection:bg-brand-coral/30 cursor-text break-all">
                          yuzhaodai@gmail.com
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </header>

            {/* EXPANDABLE MULTIDIMENSIONAL SCREENER PANEL */}
            <FilterPanel
              filters={filters}
              onChangeFilters={handleUpdateFilters}
              onResetFilters={handleResetFilters}
              isOpen={isFilterPanelOpen}
              onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              moviesCount={activeTab === "随心一刷" ? swipeCandidateMovies.length : filteredAndSortedMovies.length}
            />

            {activeTab === "随心一刷" ? (
              <TinderSwipeDeck 
                movies={swipeCandidateMovies}
                resetKey={swipeDeckResetKey}
                keyboardEnabled={activeDetailMovie === null}
                onDetails={handleOpenDetailModal}
                onAddToWatchlist={handleSwipeAddToWatchlist}
                onDismiss={handleDismissSwipeMovie}
                onUndo={handleUndoSwipe}
                onNewRound={() => setSwipeRound((round) => round + 1)}
              />
            ) : activeTab === "Vibe" ? (
              <VibePrompt
                themeMode={themeMode}
                movies={vibeCandidateMovies}
                filters={filters}
                onDetails={handleOpenDetailModal}
              />
            ) : activeTab === "观看历史" ? (
              <ListManagementView
                themeMode={themeMode}
                title="观看与浏览历史" 
                movies={watchHistoryMovies} 
                onRemove={handleRemoveFromHistory} 
                onDetails={handleOpenDetailModal} 
              />
            ) : activeTab === "待看清单" ? (
              <ListManagementView
                themeMode={themeMode}
                title="我的待看清单" 
                movies={watchlist} 
                onRemove={handleRemoveFromWatchlist} 
                onDetails={handleOpenDetailModal} 
              />
            ) : (
              <>
                {/* DYNAMIC FOCUS BILLBOARD CAROUSEL */}
                <HeroSection
                  movie={currentFeatured}
                  onDetails={handleOpenDetailModal}
                  onNext={handleNextFeatured}
                  onPrev={handlePrevFeatured}
                  isSwitching={isFeaturedSwitching}
                />

                {/* LIVE DATA CATALOG EXPLORATION GRID SLIDER */}
                <MovieSlider
                  movies={filteredAndSortedMovies}
                  fallbackMovies={catalogMovies}
                  onExplore={handleOpenDetailModal}
                />
              </>
            )}


          </main>

        </div>

      </div>

      {/* METADATA DETAILED HUD OVERLAY WINDOW */}
      <MovieDetailModal
        movie={activeDetailMovie}
        isOpen={activeDetailMovie !== null}
        onClose={() => setActiveDetailMovie(null)}
        onChangeMovie={handleOpenDetailModal}
        similarMovies={activeSimilarMovies}
        onWatchPlatform={(movie) => trackMovieInteraction(movie)}
      />

    </div>
  );
}
