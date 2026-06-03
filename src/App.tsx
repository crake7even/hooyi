import React, { useEffect, useState, useMemo } from "react";
import { Bell, ChevronDown, Flame, Check, Info, Library, Sparkles, Filter, RefreshCw, Star, Play, Sun, Moon, Mail } from "lucide-react";
import Sidebar from "./components/Sidebar";
import FilterPanel from "./components/FilterPanel";
import HeroSection from "./components/HeroSection";
import MovieSlider from "./components/MovieSlider";
import TinderSwipeDeck from "./components/TinderSwipeDeck";
import VibePrompt from "./components/VibePrompt";
import ListManagementView from "./components/ListManagementView";
import VideoPlayerModal from "./components/VideoPlayerModal";
import MovieDetailModal from "./components/MovieDetailModal";
import { FilterState, Movie, ContinueWatching } from "./types";
import {
  ALL_FILTER_VALUE,
  filterAndSortMovies,
  findContinueWatchingMovie,
  findMovieById,
  fetchCatalogMovies,
  getCatalogMovies,
  getSimilarMovies,
  getTrendingMovies,
  searchCatalogMovies,
} from "./api/movieService";

interface NotificationItem {
  id: string;
  text: string;
  time: string;
  unread: boolean;
}

const hasWatchProviders = (movie: Movie) => Boolean(movie.platforms?.length);

const mergeMoviesById = (baseMovies: Movie[], incomingMovies: Movie[]) => {
  const movieMap = new Map(baseMovies.map((movie) => [movie.id, movie]));
  for (const movie of incomingMovies) {
    movieMap.set(movie.id, movie);
  }
  return Array.from(movieMap.values());
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

export default function App() {
  const fallbackCatalogMovies = useMemo(() => getCatalogMovies(), []);
  const [catalogMovies, setCatalogMovies] = useState<Movie[]>(fallbackCatalogMovies);

  useEffect(() => {
    let cancelled = false;

    fetchCatalogMovies()
      .then((movies) => {
        if (!cancelled && movies.length > 0) {
          setCatalogMovies(movies);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogMovies(fallbackCatalogMovies);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackCatalogMovies]);

  // Multidimensional Movie Filter States
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    selectedGenre: ALL_FILTER_VALUE,
    yearRange: [2000, 2026],
    minRating: 0,
    language: "All",
    sortBy: "popular",
    selectedPlatform: null,
  });

  useEffect(() => {
    const query = filters.searchQuery.trim();
    if (query.length < 2) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchCatalogMovies(query)
        .then((movies) => {
          if (!cancelled && movies.length > 0) {
            setCatalogMovies((currentMovies) => mergeMoviesById(currentMovies, movies));
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
  const [themeMode, setThemeMode] = useState<"night" | "day">("night");

  // Playback / Detail Overlay States
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string; movieTitle: string } | null>(null);
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
    try {
      const saved = localStorage.getItem('movieApp_genres');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const watchHistoryMovies = useMemo(() => {
    return watchHistoryIds
      .map(id => findMovieById(id, catalogMovies))
      .filter((m): m is Movie => m !== undefined);
  }, [watchHistoryIds, catalogMovies]);

  const trackGenreScore = (movie: Movie, weight: number = 1) => {
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
    trackGenreScore(movie, 10);
  };

  const handleOpenDetailModal = (movie: Movie | null) => {
    if (movie) {
      trackGenreScore(movie, 1);
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

  const handleAddToWatchlist = (movie: Movie) => {
    trackGenreScore(movie, 3);
    setWatchlistIds(prev => {
      if (prev.includes(movie.id)) return prev;
      const next = [movie.id, ...prev];
      localStorage.setItem('movieApp_watchlist', JSON.stringify(next));
      return next;
    });
  };

  const handleRemoveFromWatchlist = (idsToRemove: string[]) => {
    setWatchlistIds(prev => {
      const next = prev.filter(id => !idsToRemove.includes(id));
      localStorage.setItem('movieApp_watchlist', JSON.stringify(next));
      return next;
    });
  };

  const handleRemoveFromHistory = (idsToRemove: string[]) => {
    setWatchHistoryIds(prev => {
      const next = prev.filter(id => !idsToRemove.includes(id));
      localStorage.setItem('movieApp_history', JSON.stringify(next));
      return next;
    });
  };

  // Personalized Trending Movies
  const trendMovies = useMemo(() => {
    return getTrendingMovies(catalogMovies, genreScores);
  }, [catalogMovies, genreScores]);
  
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isFeaturedSwitching, setIsFeaturedSwitching] = useState(false);
  const currentFeatured = trendMovies[featuredIndex] || catalogMovies[0];

  // Simulated notification list
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: "1", text: "新片上映：DC 宇宙《闪电侠（2023）》已准备好 4K 流媒体播放！", time: "5分钟前", unread: true },
    { id: "2", text: "继续观看：你上次观看的《暗黑 第3季》进度已到 75%。", time: "2小时前", unread: true },
    { id: "3", text: "宫崎骏经典《千与千寻》推出高清重置日语原音版本。", time: "1天前", unread: false },
    { id: "4", text: "串流质量已自动升级至 1080p 超高码率。", time: "2天前", unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Live Filtering and Sorting logic computation
  const filteredAndSortedMovies = useMemo(() => {
    return filterAndSortMovies(catalogMovies, filters, genreScores);
  }, [catalogMovies, filters, genreScores]);

  const watchableCatalogMovies = useMemo(() => {
    return catalogMovies.filter(hasWatchProviders);
  }, [catalogMovies]);

  const watchableFilteredAndSortedMovies = useMemo(() => {
    return filteredAndSortedMovies.filter(hasWatchProviders);
  }, [filteredAndSortedMovies]);

  const vibeCandidateMovies = watchableCatalogMovies.length > 0 ? watchableCatalogMovies : catalogMovies;

  const swipeDeckResetKey = useMemo(
    () => JSON.stringify({ filters, onlineOnly: true }),
    [filters],
  );

  const activeSimilarMovies = useMemo(() => {
    return activeDetailMovie ? getSimilarMovies(activeDetailMovie, catalogMovies) : [];
  }, [activeDetailMovie, catalogMovies]);

  // Handle Carousel Pagination limits
  const preloadBackdrop = (movie: Movie) => {
    return new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = movie.backdropUrl;
    });
  };

  const switchFeaturedMovie = async (getNextIndex: (current: number, total: number) => number) => {
    const total = Math.max(trendMovies.length, 1);
    const nextIndex = getNextIndex(featuredIndex, total);
    const nextMovie = trendMovies[nextIndex] || catalogMovies[nextIndex] || catalogMovies[0];

    if (!nextMovie || isFeaturedSwitching) return;

    setIsFeaturedSwitching(true);
    await preloadBackdrop(nextMovie);
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
  const handleUpdateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      selectedGenre: ALL_FILTER_VALUE,
      yearRange: [2000, 2026],
      minRating: 0,
      language: ALL_FILTER_VALUE,
      sortBy: "popular",
      selectedPlatform: null,
    });
  };

  // Launch modal player for arbitrary clips
  const handlePlayVideo = (url: string, title: string, movieTitle: string) => {
    setActiveVideo({ url, title, movieTitle });
  };

  // Play clip direct from movie object wrapper
  const handlePlayMovieTrailer = (movie: Movie) => {
    trackGenreScore(movie, 2);
    setActiveDetailMovie(null); // Close the detail modal if it's open
    setActiveVideo({
      url: movie.trailerUrl,
      title: `${movie.title} - Official Trailer Preview`,
      movieTitle: movie.title,
    });
  };

  // Resume playback event trigger
  const handleSelectContinueWatching = (watchItem: ContinueWatching) => {
    const parentMovie = findContinueWatchingMovie(watchItem.id, catalogMovies);
    const targetUrl = parentMovie ? parentMovie.trailerUrl : "https://assets.mixkit.co/videos/preview/mixkit-thick-fog-moving-through-forest-trees-42289-large.mp4";
    
    if (parentMovie) {
      trackMovieInteraction(parentMovie);
    }
    
    setActiveVideo({
      url: targetUrl,
      title: `Resuming: ${watchItem.title} (${watchItem.episodeInfo})`,
      movieTitle: watchItem.title,
    });

    // Mark associated alert as read
    setNotifications(prev =>
      prev.map(n => n.text.includes(watchItem.title) ? { ...n, unread: false } : n)
    );
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

  // Read all notifications simulation trigger
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <div className={`relative min-h-screen text-white overflow-x-hidden font-sans p-4 md:p-6 select-none flex items-start lg:items-center justify-center`}>
      {/* Background Layers for smooth transition */}
      <div className={`fixed inset-0 bg-gradient-to-b from-[#141320] via-[#4b312b] to-[#eb711f] transition-opacity duration-1000 -z-20 ${themeMode === "night" ? "opacity-100" : "opacity-0"}`} />
      <div className={`fixed inset-0 bg-gradient-to-b from-[#32448f] via-[#8195d2] to-[#f3cae8] transition-opacity duration-1000 -z-20 ${themeMode === "day" ? "opacity-100" : "opacity-0"}`} />
      
      {/* Absolute floating cinematic decorative projection lamps */}
      <div className={`absolute top-[5%] right-[10%] w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none animate-pulse-slow transition-all duration-1000 -z-10 ${
        themeMode === "night" ? "bg-[#eb711f]/15" : "bg-[#f3cae8]/30"
      }`}></div>
      <div className={`absolute top-[20%] left-[5%] w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-all duration-1000 -z-10 ${
        themeMode === "night" ? "bg-[#4b312b]/30" : "bg-[#8195d2]/20"
      }`}></div>
      <div className={`absolute bottom-[15%] right-[15%] w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none animate-pulse-slow transition-all duration-1000 -z-10 ${
        themeMode === "night" ? "bg-[#eb711f]/10" : "bg-[#32448f]/20"
      }`}></div>
 
      {/* Main glass frame boundaries wrapper */}
      <div 
        className="relative w-full max-w-7xl mx-auto my-auto flex flex-col gap-4 p-4 md:p-5 rounded-[36px] z-10 transition-all duration-1000"
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/[0.05] pb-4 mb-2 gap-3 relative">
          <div className="text-left">
            <h1 className="text-white font-serif font-extrabold text-3xl md:text-4xl tracking-tight leading-none">
              好影
            </h1>
            <p className="text-white/40 text-xs md:text-sm mt-2 leading-relaxed tracking-wide">
              只看好影片  您的院线与流媒体直通指南
            </p>
          </div>
          
          {/* User's uploaded custom LOGO image in the top center area removed */}
        </div>
        
        {/* Master Row Panel containing left drawer sidebar and right widescreen monitor area */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          
          {/* LEFT SIDEBAR PANEL: Built dynamically with widgets */}
          <Sidebar
            searchQuery={filters.searchQuery}
            setSearchQuery={(q) => handleUpdateFilters({ searchQuery: q })}
            onPlayTrailer={handlePlayVideo}
            selectedPlatform={filters.selectedPlatform || null}
            onSelectPlatform={(platform) => handleUpdateFilters({ selectedPlatform: platform })}
            onDetails={(movie) => setActiveDetailMovie(movie)}
            movies={catalogMovies}
            watchlist={watchlist}
            watchHistory={watchHistoryMovies}
            onOpenFullView={(view) => setActiveTab(view)}
          />

          {/* RIGHT MAIN SHOWCASE: Wide dynamic monitor display area */}
          <main className="flex-1 w-full flex flex-col gap-5 min-w-0 min-h-[650px] lg:min-h-[750px]">
            
            {/* Top Navigation Row */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2 lg:py-0 lg:h-[44px] relative z-30 w-full shrink-0">
              
              {/* Category Pill Buttons */}
              <nav className="flex flex-1 items-stretch gap-2 p-1 bg-white/[0.02] border border-white/[0.04] backdrop-blur-md rounded-2xl w-full overflow-hidden">
                {menuCategories.map((cat) => {
                  const isActive = activeTab === cat;

                  return (
                    <button
                      key={cat}
                      onClick={() => handleMenuCategoryClick(cat)}
                      className={`flex-1 py-1.5 lg:py-2 text-sm font-bold rounded-xl transition-all capitalize cursor-pointer shrink-0 text-center ${
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
              <div className="flex items-center justify-end gap-3 w-full lg:w-auto relative z-20">

                {/* Day / Night Theme Toggle */}
                <button
                  onClick={() => setThemeMode(themeMode === "night" ? "day" : "night")}
                  className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.15] text-white/80 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
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

                {/* Profile menu drop toggle */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowProfileDropdown(!showProfileDropdown);
                    }}
                    aria-label="Profile dropdown"
                    aria-haspopup="true"
                    aria-expanded={showProfileDropdown}
                    className="flex items-center gap-3 p-1.5 pr-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
                  >
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/5 relative border border-white/10 shrink-0 flex items-center justify-center">
                      <Mail size={14} className="text-white/70" />
                    </div>
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-white text-[11px] font-bold tracking-tight">开发者</span>
                      <span className="text-white/40 text-[9px] font-mono">@yuzhaodai</span>
                    </div>
                    <ChevronDown size={11} className="text-white/40" />
                  </button>

                  {/* Profile configuration dropdown options */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-3 z-40 w-52 p-2 rounded-2xl bg-neutral-950 border border-white/10 shadow-2xl flex flex-col gap-1 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-3 py-3 rounded-lg bg-white/[0.02] border border-white/[0.02]">
                        <p className="text-[10px] text-white/50 lowercase mb-1.5">联系开发者 / 意见反馈</p>
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
              moviesCount={activeTab === "随心一刷" ? watchableFilteredAndSortedMovies.length : filteredAndSortedMovies.length}
            />

            {activeTab === "随心一刷" ? (
              <TinderSwipeDeck 
                movies={watchableFilteredAndSortedMovies}
                resetKey={swipeDeckResetKey}
                onDetails={handleOpenDetailModal} 
                onAddToWatchlist={handleAddToWatchlist}
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
                title="观看与浏览历史" 
                movies={watchHistoryMovies} 
                onRemove={handleRemoveFromHistory} 
                onDetails={handleOpenDetailModal} 
              />
            ) : activeTab === "待看清单" ? (
              <ListManagementView 
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
                  onPlay={handlePlayMovieTrailer}
                  onDetails={handleOpenDetailModal}
                  onNext={handleNextFeatured}
                  onPrev={handlePrevFeatured}
                  isSwitching={isFeaturedSwitching}
                />

                {/* LIVE DATA CATALOG EXPLORATION GRID SLIDER */}
                <MovieSlider
                  movies={filteredAndSortedMovies}
                  fallbackMovies={catalogMovies}
                  onPlay={handlePlayMovieTrailer}
                  onExplore={handleOpenDetailModal}
                />
              </>
            )}

          </main>

        </div>

      </div>

      {/* DETAILED CINEMATIC PLAYER SCREEN POPUP */}
      <VideoPlayerModal
        videoUrl={activeVideo?.url || ""}
        title={activeVideo?.title || ""}
        movieTitle={activeVideo?.movieTitle || ""}
        isOpen={activeVideo !== null}
        onClose={() => setActiveVideo(null)}
      />

      {/* METADATA DETAILED HUD OVERLAY WINDOW */}
      <MovieDetailModal
        movie={activeDetailMovie}
        isOpen={activeDetailMovie !== null}
        onClose={() => setActiveDetailMovie(null)}
        onPlayTrailer={handlePlayMovieTrailer}
        onChangeMovie={handleOpenDetailModal}
        similarMovies={activeSimilarMovies}
        onWatchPlatform={(movie) => trackMovieInteraction(movie)}
      />

    </div>
  );
}
