import React from "react";
import { Filter, Star, RefreshCw, Layers, Calendar, Disc3, SortAsc } from "lucide-react";
import { GENRES, LANGUAGES } from "../data";
import { FilterState } from "../types";

interface FilterPanelProps {
  filters: FilterState;
  onChangeFilters: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
  moviesCount: number;
}

const GENRE_CHINESE: Record<string, string> = {
  "All": "全部",
  "Animation": "动画",
  "Adventure": "冒险",
  "Sci-Fi": "科幻",
  "Mystery": "悬疑",
  "Drama": "剧情",
  "Fantasy": "奇幻",
  "Action": "动作"
};

const LANGUAGE_CHINESE: Record<string, string> = {
  "All": "所有语言",
  "en": "英语",
  "ja": "日语",
  "ko": "韩语",
  "fr": "法语",
  "de": "德语"
};

const SORT_CHINESE: Record<string, string> = {
  "popular": "最热门",
  "newest": "最新发布",
  "rating": "评分最高"
};

export default function FilterPanel({
  filters,
  onChangeFilters,
  onResetFilters,
  isOpen,
  onToggle,
  moviesCount,
}: FilterPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="w-full">
      {/* Advanced Filter Body */}
      <div className="glass-panel p-6 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative overflow-hidden">
        {/* Subtle atmospheric glow inside pane */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-coral/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        
        {/* Genre Column */}
        <div className="flex flex-col gap-3">
          <label className="text-white/50 text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Layers size={12} className="text-brand-coral" />
            电影流派筛选 / Genres
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto scrollbar-none">
            {GENRES.map((g) => {
              const isSelected = filters.selectedGenre === g;
              return (
                <button
                  key={g}
                  onClick={() => onChangeFilters({ selectedGenre: g })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-brand-coral text-white shadow-lg shadow-brand-coral/15"
                      : "bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {GENRE_CHINESE[g] || g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Release Year Column */}
        <div className="flex flex-col gap-3">
          <label className="text-white/50 text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Calendar size={12} className="text-brand-coral" />
            上映年份区间 / Year
          </label>
          <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
              <span>{filters.yearRange[0]} 年</span>
              <span className="text-brand-coral font-sans text-[11px]">至</span>
              <span>{filters.yearRange[1]} 年</span>
            </div>
            <input
              type="range"
              min="2000"
              max="2026"
              value={filters.yearRange[1]}
              onChange={(e) =>
                onChangeFilters({ yearRange: [filters.yearRange[0], parseInt(e.target.value)] })
              }
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-coral focus:outline-none"
            />
            <span className="text-[10px] text-white/30 text-center font-light">
              拖动滑块调整最大首映年份
            </span>
          </div>
        </div>

        {/* Rating Scale Column */}
        <div className="flex flex-col gap-3">
          <label className="text-white/50 text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Star size={12} className="text-brand-coral" />
            最低 IMDb 评分 / Rating
          </label>
          <div className="flex flex-col gap-2.5 bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-white/80 font-semibold">{filters.minRating === 0 ? "不限评分" : `${filters.minRating.toFixed(1)}分以上`}</span>
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => {
                  const value = (i + 1) * 2;
                  return (
                    <Star
                      key={i}
                      size={11}
                      className={value <= filters.minRating ? "fill-amber-400 text-amber-400" : "text-white/15"}
                    />
                  );
                })}
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="9"
              step="0.5"
              value={filters.minRating}
              onChange={(e) => onChangeFilters({ minRating: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-coral focus:outline-none"
            />
            <div className="flex justify-between text-[9px] text-white/30 font-mono">
              <span>0.0</span>
              <span>5.0</span>
              <span>9.0</span>
            </div>
          </div>
        </div>

        {/* Sort & Language Column */}
        <div className="flex flex-col gap-3">
          {/* Language Selection */}
          <div>
            <label className="text-white/50 text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5 mb-2">
              <Disc3 size={11} className="text-brand-coral" />
              原作语言 / Language
            </label>
            <select
              value={filters.language}
              onChange={(e) => onChangeFilters({ language: e.target.value })}
              className="w-full px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] focus:border-brand-coral/40 rounded-xl text-white text-xs font-medium focus:outline-none transition-all cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-neutral-900 text-white">
                  {LANGUAGE_CHINESE[lang.code] || lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Criteria */}
          <div>
            <label className="text-white/50 text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5 mb-2">
              <SortAsc size={11} className="text-brand-coral" />
              排序方式 / Sort
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white/[0.02] border border-white/[0.04] p-1 rounded-xl">
              {(["popular", "newest", "rating"] as const).map((method) => {
                const isSelected = filters.sortBy === method;
                return (
                  <button
                    key={method}
                    onClick={() => onChangeFilters({ sortBy: method })}
                    className={`py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white/[0.08] text-white"
                        : "text-white/40 hover:text-white/85"
                    }`}
                  >
                    {SORT_CHINESE[method]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Filters Shortcut Button */}
          <button
            onClick={onResetFilters}
            className="mt-1 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] text-xs font-bold text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="重置过滤条件"
          >
            <RefreshCw size={11} className="text-brand-coral shrink-0" />
            重置筛选条件
          </button>
        </div>
      </div>
    </div>
  );
}
