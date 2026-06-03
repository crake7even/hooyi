import React from "react";
import { Search, Flame, Play, CheckCircle, Settings2, ChevronDown } from "lucide-react";
import { Movie, WatchPlatformType } from "../types";
import { findMovieByTitle } from "../api/movieService";

interface SidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onPlayTrailer: (videoUrl: string, title: string, movieTitle: string) => void;
  selectedPlatform: WatchPlatformType | null;
  onSelectPlatform: (platform: WatchPlatformType | null) => void;
  onDetails?: (movie: Movie) => void;
  movies: Movie[];
  watchlist: Movie[];
  watchHistory: Movie[];
  onOpenFullView: (view: "待看清单" | "观看历史") => void;
}

export default function Sidebar({
  searchQuery,
  setSearchQuery,
  onPlayTrailer,
  selectedPlatform,
  onSelectPlatform,
  onDetails,
  movies,
  watchlist,
  watchHistory,
  onOpenFullView,
}: SidebarProps) {
  const [mobileOpenSections, setMobileOpenSections] = React.useState({
    watchlist: false,
    history: false,
  });

  const handleOpenMovie = (title: string) => {
    if (onDetails) {
       const found = findMovieByTitle(title, movies);
       if (found) onDetails(found);
    }
  };

  const toggleMobileSection = (section: "watchlist" | "history") => {
    setMobileOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderWatchlistItems = () => (
    <>
      {watchlist.length > 0 ? watchlist.map((movie) => (
        <div
          key={movie.id}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOpenMovie(movie.title);
            }
          }}
          onClick={() => handleOpenMovie(movie.title)}
          className="relative group font-sans cursor-pointer overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.03] p-1.5 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all flex gap-3 h-[72px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
        >
          <div className="relative w-23 h-full shrink-0 rounded-lg overflow-hidden bg-zinc-800">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-brand-coral group-hover:scale-110 transition-all shadow-md">
                <Play size={10} className="text-white fill-white translate-x-px" />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center min-w-0 pr-2">
            <p className="text-white font-serif font-semibold text-xs leading-snug group-hover:text-brand-coral transition-colors truncate">
              {movie.title}
            </p>
            <p className="text-white/40 text-[10px] mt-0.5 truncate uppercase">{movie.genres.join(", ")}</p>
            <span className="text-[9px] text-white/30 mt-1 font-mono">最近添加</span>
          </div>
        </div>
      )) : (
        <div className="flex items-center justify-center h-full text-white/30 text-sm md:text-base text-center px-4 leading-relaxed font-medium">
          超多精彩<br/>待你发掘
        </div>
      )}
    </>
  );

  const renderHistoryItems = () => (
    <>
      {watchHistory.length > 0 ? watchHistory.map((item) => (
        <div
          key={item.id}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOpenMovie(item.title);
            }
          }}
          onClick={() => handleOpenMovie(item.title)}
          className="group cursor-pointer flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.03] hover:border-white/[0.08] transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
              <img
                src={item.posterUrl || item.backdropUrl}
                alt={item.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <p className="text-white text-xs font-semibold truncate group-hover:text-brand-coral transition-all">
                {item.title}
              </p>
              <p className="text-white/40 text-[10px] mt-0.5 truncate uppercase">
                {item.genres ? item.genres.slice(0, 2).join(", ") : "已观看"}
              </p>
            </div>
          </div>
        </div>
      )) : (
        <div className="flex items-center justify-center h-full text-white/30 text-sm md:text-base text-center px-4 leading-relaxed font-medium">
          暂无观看记录<br/>请挑选想看的影片
        </div>
      )}
    </>
  );

  return (
    <aside className="w-full lg:w-[280px] xl:w-[320px] flex flex-col gap-5 shrink-0">
      {/* Search Container */}
      <div className="relative group shrink-0 w-full lg:h-[44px] flex items-center">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-brand-coral transition-colors">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索电影、流媒体、流派..."
          className="w-full h-full pl-11 pr-4 py-3 lg:py-0 bg-white/[0.04] focus:bg-white/[0.08] hover:bg-white/[0.06] border border-white/[0.08] focus:border-brand-coral/40 rounded-2xl text-white text-sm placeholder-white/40 font-medium focus:outline-none transition-all placeholder:font-light"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {/* Mobile Collapsed Library Sections */}
      <div className="lg:hidden flex flex-col gap-3">
        <div className="glass-panel rounded-[22px] border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="w-full p-4 flex items-center justify-between gap-2">
            <button
              onClick={() => toggleMobileSection("watchlist")}
              className="flex flex-1 items-center gap-2 text-left min-w-0"
              aria-expanded={mobileOpenSections.watchlist}
            >
              <Flame size={18} className="text-brand-coral fill-brand-coral/20 animate-pulse" />
              <span className="text-white font-bold tracking-tight text-base uppercase">待看清单</span>
              <span className="text-white/35 text-xs font-mono">{watchlist.length}</span>
            </button>
            <button
              onClick={() => onOpenFullView("待看清单")}
              className="text-white/50 hover:text-white flex items-center justify-center transition-colors w-7 h-7 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              title="管理待看清单"
              aria-label="管理待看清单"
            >
              <Settings2 size={15} />
            </button>
            <button
              onClick={() => toggleMobileSection("watchlist")}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              aria-label={mobileOpenSections.watchlist ? "收起待看清单" : "展开待看清单"}
            >
              <ChevronDown
                size={16}
                className={`text-white/45 transition-transform ${mobileOpenSections.watchlist ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          {mobileOpenSections.watchlist && (
            <div className="px-4 pb-4">
              <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto scrollbar-none pr-1">
                {renderWatchlistItems()}
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[22px] border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="w-full p-4 flex items-center justify-between gap-2">
            <button
              onClick={() => toggleMobileSection("history")}
              className="flex flex-1 items-center gap-2 text-left min-w-0"
              aria-expanded={mobileOpenSections.history}
            >
              <CheckCircle size={16} className="text-brand-coral" />
              <span className="text-white font-bold tracking-tight text-base uppercase">观看历史</span>
              <span className="text-white/35 text-xs font-mono">{watchHistory.length}</span>
            </button>
            <button
              onClick={() => onOpenFullView("观看历史")}
              className="text-white/50 hover:text-white flex items-center justify-center transition-colors w-7 h-7 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              title="管理观看历史"
              aria-label="管理观看历史"
            >
              <Settings2 size={15} />
            </button>
            <button
              onClick={() => toggleMobileSection("history")}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              aria-label={mobileOpenSections.history ? "收起观看历史" : "展开观看历史"}
            >
              <ChevronDown
                size={16}
                className={`text-white/45 transition-transform ${mobileOpenSections.history ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          {mobileOpenSections.history && (
            <div className="px-4 pb-4">
              <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto scrollbar-none pr-1">
                {renderHistoryItems()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Watchlist Section */}
      <div className="hidden lg:flex glass-panel p-5 rounded-[24px] flex-col gap-4 h-[300px] md:h-[340px] lg:h-[380px] shrink-0 border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-brand-coral fill-brand-coral/20 animate-pulse" />
            <span className="text-white font-bold tracking-tight text-base uppercase">待看清单</span>
          </div>
          <button 
            onClick={() => onOpenFullView("待看清单")}
            className="text-white/50 hover:text-white flex items-center justify-center transition-colors w-7 h-7 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
            title="管理待看清单"
            aria-label="管理待看清单"
          >
            <Settings2 size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto scrollbar-none pr-1 flex-1 min-h-0">
          {renderWatchlistItems()}
        </div>
      </div>

      {/* Watched Movies Section */}
      <div className="hidden lg:flex glass-panel p-5 rounded-[24px] flex-col gap-4 flex-1 min-h-0 border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-brand-coral" />
            <h3 className="text-white font-bold tracking-tight text-base uppercase">观看历史</h3>
          </div>
          <button 
            onClick={() => onOpenFullView("观看历史")}
            className="text-white/50 hover:text-white flex items-center justify-center transition-colors w-7 h-7 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
            title="管理观看历史"
            aria-label="管理观看历史"
          >
            <Settings2 size={15} />
          </button>
        </div>

        <div className="relative flex-1 w-full min-h-0">
          <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto scrollbar-none pr-1 pb-1">
            {renderHistoryItems()}
        </div>
        </div>
      </div>
    </aside>
  );
}
