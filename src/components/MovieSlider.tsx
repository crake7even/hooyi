import React, { useRef } from "react";
import { Play, Eye, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Movie } from "../types";
import { hideBrokenImage } from "./imageFallback";

interface MovieSliderProps {
  movies: Movie[];
  fallbackMovies?: Movie[];
  onPlay: (movie: Movie) => void;
  onExplore: (movie: Movie) => void;
  disablePadding?: boolean;
}

export default function MovieSlider({ movies, fallbackMovies = [], onPlay, onExplore, disablePadding }: MovieSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handlePrev = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -scrollContainerRef.current.clientWidth * 0.8,
        behavior: "smooth",
      });
    }
  };

  const handleNext = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: scrollContainerRef.current.clientWidth * 0.8,
        behavior: "smooth",
      });
    }
  };

  let displayedMovies = movies;
  
  if (!disablePadding && displayedMovies.length > 0 && displayedMovies.length < 4) {
    const extraPool = fallbackMovies.filter(
      (m) => !movies.some((dm) => dm.id === m.id)
    );
    displayedMovies = [...displayedMovies, ...extraPool].slice(0, 4);
  }

  return (
    <div className="flex flex-col gap-4 relative group">
      {/* List Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <span>探索目录</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-coral"></span>
        </h3>
      </div>

      {/* Grid Core */}
      {displayedMovies.length === 0 ? (
        <div className="glass-panel py-16 rounded-[24px] flex flex-col items-center justify-center text-center gap-2">
          <p className="text-white/40 text-sm">抱歉，没有找到匹配您当前过滤选项的电影。</p>
          <p className="text-xs text-white/20">请尝试重置或放宽过滤条件。</p>
        </div>
      ) : (
        <div className="relative group">
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-3 md:gap-5 snap-x snap-mandatory scroll-smooth scrollbar-hide py-6 -my-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayedMovies.map((movie) => (
              <div
                key={movie.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onExplore(movie);
                  }
                }}
                onClick={() => onExplore(movie)}
                className="w-[calc(100%-1.5rem)] sm:w-[calc((100%-1*0.75rem)/2)] md:w-[calc((100%-2*1.25rem)/3)] lg:w-[calc((100%-3*1.25rem)/4)] shrink-0 snap-center md:snap-start relative group/card rounded-[24px] overflow-hidden glass-card aspect-[2/3] select-none flex flex-col justify-end cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral z-10"
              >
                {/* Poster image background */}
                <div className="absolute inset-0 bg-neutral-900 z-0">
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={hideBrokenImage}
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700 ease-out-quint"
                  />
                  {/* Visual mask */}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent opacity-90 group-hover/card:opacity-95 transition-opacity"></div>
                </div>

                {/* Badges list overlay */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                  <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-[9px] font-bold tracking-wider font-mono">
                    {movie.genres[0]}
                  </span>
                </div>

                <div className="absolute top-3 right-3 z-10">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-950/85 backdrop-blur-md border border-white/5 text-amber-400 text-[10px] font-bold font-mono">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    {movie.rating.toFixed(1)}
                  </span>
                </div>

                {/* Content Panel on top of Card */}
                <div className="p-4 relative z-10 flex flex-col gap-1 w-full text-left">
                  {/* Year Label */}
                  <span className="text-[10px] font-mono font-medium text-white/45">
                    {movie.year}
                  </span>

                  {/* Film Title */}
                  <h4 className="text-white font-serif font-bold text-[15px] leading-snug truncate group-hover/card:text-brand-coral transition-colors">
                    {movie.title}
                  </h4>

                  {/* Collapsible description / synopsis overlay triggered on hover */}
                  <p className="text-white/50 text-[11px] leading-snug line-clamp-2 max-h-0 opacity-0 group-hover/card:max-h-[36px] group-hover/card:opacity-100 transition-all duration-500 ease-in-out font-medium mt-0.5">
                    {movie.synopsis}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <>
            <button
              onClick={handlePrev}
              className="absolute left-0 md:left-0 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/40 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 z-20 cursor-pointer hidden md:flex items-center justify-center text-white drop-shadow-md"
            >
              <ChevronLeft size={24} className="stroke-[2.5]" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-0 md:right-0 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/40 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 z-20 cursor-pointer hidden md:flex items-center justify-center text-white drop-shadow-md"
            >
              <ChevronRight size={24} className="stroke-[2.5]" />
            </button>
          </>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
      `}} />
    </div>
  );
}
