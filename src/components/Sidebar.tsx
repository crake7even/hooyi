import React from "react";
import { Search, Flame, CheckCircle, Settings2, ChevronDown, Sparkles } from "lucide-react";
import { Movie, WatchPlatformType } from "../types";
import { findMovieByTitle } from "../api/movieService";
import { hideBrokenImage } from "./imageFallback";

interface SidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** @deprecated 预告片入口已移除，保留可选以兼容旧调用 */
  onPlayTrailer?: (videoUrl: string, title: string, movieTitle: string) => void;
  selectedPlatform: WatchPlatformType | null;
  onSelectPlatform: (platform: WatchPlatformType | null) => void;
  onDetails?: (movie: Movie) => void;
  movies: Movie[];
  watchlist: Movie[];
  watchHistory: Movie[];
  onOpenFullView: (view: "待看清单" | "观看历史") => void;
  themeMode?: "night" | "day";
  /** 空待看清单里的“去随心一刷”入口 */
  onDiscover?: () => void;
  /** 桌面端放在侧栏顶部的品牌区（替代搜索框的位置，搜索框移到顶部导航行） */
  brand?: React.ReactNode;
}

export default function Sidebar({
  searchQuery,
  setSearchQuery,
  selectedPlatform,
  onSelectPlatform,
  onDetails,
  movies,
  watchlist,
  watchHistory,
  onOpenFullView,
  themeMode = "night",
  onDiscover,
  brand,
}: SidebarProps) {
  const isDay = themeMode === "day";
  // 日间背景偏浅：条目与空态加深色半透明底，副文字提到 white/90，保证 ≥4.5:1
  const itemSurface = isDay
    ? "bg-neutral-950/55 border-white/10 hover:bg-neutral-950/65 hover:border-white/20"
    : "bg-white/[0.02] border-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.1]";
  const subText = isDay ? "text-white/90" : "text-white/40";
  const metaText = isDay ? "text-white/90" : "text-white/30";
  // 空态不放说明文字：用淡出的占位轮廓暗示内容形态，待看清单再给一个去挑片的入口。
  const placeholderSurface = isDay ? "bg-white/[0.10] border-white/[0.14]" : "bg-white/[0.03] border-white/[0.05]";
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
          className={`relative group font-sans cursor-pointer overflow-hidden rounded-xl border ${itemSurface} p-1.5 transition-all flex gap-3 h-[72px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral`}
        >
          <div className="relative w-23 h-full shrink-0 rounded-lg overflow-hidden bg-zinc-800">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={hideBrokenImage}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="flex flex-col justify-center min-w-0 pr-2">
            <p className="text-white font-serif font-semibold text-xs leading-snug group-hover:text-brand-coral transition-colors truncate">
              {movie.title}
            </p>
            <p className={`${subText} text-[10px] mt-0.5 truncate uppercase`}>{movie.genres.join(", ")}</p>
            <span className={`text-[9px] ${metaText} mt-1 font-mono`}>最近添加</span>
          </div>
        </div>
      )) : (
        <div className="relative flex flex-col gap-3 h-full min-h-[200px]">
          {[0, 1, 2].map((slot) => (
            <div
              key={slot}
              aria-hidden="true"
              className={`flex gap-3 h-[72px] shrink-0 rounded-xl border p-1.5 ${placeholderSurface}`}
              style={{ opacity: 1 - slot * 0.3 }}
            >
              <div className="w-[46px] h-full rounded-lg bg-white/[0.08]" />
              <div className="flex flex-col justify-center gap-2 flex-1 pr-6">
                <div className="h-2 rounded-full bg-white/[0.12] w-3/4" />
                <div className="h-1.5 rounded-full bg-white/[0.08] w-1/2" />
              </div>
            </div>
          ))}
          {onDiscover && (
            <div className="absolute inset-x-0 bottom-2 flex justify-center">
              <button
                type="button"
                onClick={onDiscover}
                className="min-h-11 px-5 rounded-full bg-brand-coral/90 hover:bg-brand-coral text-white text-sm font-bold shadow-lg shadow-brand-coral/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Sparkles size={15} />
                去随心一刷挑几部
              </button>
            </div>
          )}
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
          className={`group cursor-pointer flex items-center justify-between p-2 rounded-xl border ${itemSurface} transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
              <img
                src={item.posterUrl || item.backdropUrl}
                alt={item.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={hideBrokenImage}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <p className="text-white text-xs font-semibold truncate group-hover:text-brand-coral transition-all">
                {item.title}
              </p>
              <p className={`${subText} text-[10px] mt-0.5 truncate uppercase`}>
                {item.genres ? item.genres.slice(0, 2).join(", ") : "已观看"}
              </p>
            </div>
          </div>
        </div>
      )) : (
        <div className="flex flex-col gap-3" aria-label="还没有观看记录">
          {[0, 1, 2].map((slot) => (
            <div
              key={slot}
              aria-hidden="true"
              className={`flex items-center gap-3 p-2 rounded-xl border shrink-0 ${placeholderSurface}`}
              style={{ opacity: 1 - slot * 0.3 }}
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.08] shrink-0" />
              <div className="flex flex-col gap-2 flex-1 pr-8">
                <div className="h-2 rounded-full bg-white/[0.12] w-2/3" />
                <div className="h-1.5 rounded-full bg-white/[0.08] w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <aside className="w-full lg:w-[280px] xl:w-[320px] flex flex-col gap-5 shrink-0 fit:min-h-0">
      {brand && <div className="hidden lg:flex items-center shrink-0 h-[44px]">{brand}</div>}
      <div className={brand ? "lg:hidden" : undefined}>
        <SearchBox value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Mobile Collapsed Library Sections */}
      <div className="lg:hidden flex flex-col gap-3">
        <div className="glass-panel rounded-[22px] border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="w-full p-4 flex items-center justify-between gap-2">
            <button
              onClick={() => toggleMobileSection("watchlist")}
              className="flex min-h-11 flex-1 items-center gap-2 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              aria-expanded={mobileOpenSections.watchlist}
            >
              <Flame size={18} className="text-brand-coral fill-brand-coral/20 animate-pulse" />
              <span className="text-white font-bold tracking-tight text-base uppercase">待看清单</span>
              <span className="text-white/35 text-xs font-mono">{watchlist.length}</span>
            </button>
            <button
              onClick={() => onOpenFullView("待看清单")}
              className="text-white/50 hover:text-white flex items-center justify-center transition-colors w-11 h-11 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              title="管理待看清单"
              aria-label="管理待看清单"
            >
              <Settings2 size={15} />
            </button>
            <button
              onClick={() => toggleMobileSection("watchlist")}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
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
              className="flex min-h-11 flex-1 items-center gap-2 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              aria-expanded={mobileOpenSections.history}
            >
              <CheckCircle size={16} className="text-brand-coral" />
              <span className="text-white font-bold tracking-tight text-base uppercase">观看历史</span>
              <span className="text-white/35 text-xs font-mono">{watchHistory.length}</span>
            </button>
            <button
              onClick={() => onOpenFullView("观看历史")}
              className="text-white/50 hover:text-white flex items-center justify-center transition-colors w-11 h-11 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              title="管理观看历史"
              aria-label="管理观看历史"
            >
              <Settings2 size={15} />
            </button>
            <button
              onClick={() => toggleMobileSection("history")}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
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
      <div className="hidden lg:flex glass-panel p-5 rounded-[24px] flex-col gap-4 h-[300px] md:h-[340px] lg:h-[380px] fit:!h-auto fit:flex-1 fit:basis-0 fit:min-h-0 shrink-0 border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-brand-coral fill-brand-coral/20 animate-pulse" />
            <span className="text-white font-bold tracking-tight text-base uppercase">待看清单</span>
          </div>
          <button 
            onClick={() => onOpenFullView("待看清单")}
            className="text-white/50 hover:text-white flex items-center justify-center transition-colors w-11 h-11 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
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
            className="text-white/50 hover:text-white flex items-center justify-center transition-colors w-11 h-11 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
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

export function SearchBox({ value, onChange }: { value: string; onChange: (query: string) => void }) {
  return (
    <div className="relative group shrink-0 w-full lg:h-[44px] flex items-center">
      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-brand-coral transition-colors">
        <Search size={18} />
      </span>
      <input
        type="text"
        aria-label="搜索电影、流媒体或流派"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索影片、类型…"
        className="w-full h-full pl-11 pr-4 py-3 lg:py-0 bg-white/[0.04] focus:bg-white/[0.08] hover:bg-white/[0.06] border border-white/[0.08] focus:border-brand-coral/40 rounded-2xl text-white text-sm placeholder-white/40 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral transition-all placeholder:font-light"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 min-w-11 pr-4 flex items-center justify-end text-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
        >
          ×
        </button>
      )}
    </div>
  );
}
