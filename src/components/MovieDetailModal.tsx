import React from "react";
import { X, Play, Heart, Star, Film, Sparkles, User, Calendar, Languages, Tv, ExternalLink } from "lucide-react";
import { Movie, WatchPlatform } from "../types";
import { hideBrokenImage } from "./imageFallback";

interface MovieDetailModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayTrailer: (movie: Movie) => void;
  onChangeMovie: (movie: Movie) => void;
  similarMovies?: Movie[];
  onWatchPlatform?: (movie: Movie) => void;
}

const getPlatformSearchUrl = (platform: WatchPlatform, title: string) => {
  const query = encodeURIComponent(title);

  if (platform.type === "netflix") return `https://www.netflix.com/search?q=${query}`;
  if (platform.type === "prime") return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`;
  if (platform.type === "apple") return `https://tv.apple.com/search?term=${query}`;
  if (platform.type === "disney") return `https://www.disneyplus.com/search?q=${query}`;

  return null;
};

export default function MovieDetailModal({
  movie,
  isOpen,
  onClose,
  onPlayTrailer,
  onChangeMovie,
  similarMovies = [],
  onWatchPlatform,
}: MovieDetailModalProps) {
  if (!isOpen || !movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-xl animate-fade-in text-left">
      {/* Visual background gradient projector */}
      <div className="absolute inset-0 bg-radial bg-gradient-to-tr from-brand-bronze-dark/50 via-transparent to-transparent pointer-events-none"></div>

      {/* Main Glass Panel Card */}
      <div className="relative w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl z-10 flex flex-col scale-in max-h-[90vh] overflow-y-auto cinema-scrollbar border border-white/10 bg-neutral-950/92 backdrop-blur-2xl">
        
        {/* Unified ambient backdrop */}
        <div className="absolute inset-0 bg-neutral-950 pointer-events-none overflow-hidden z-0">
          <img
            src={movie.backdropUrl}
            alt={movie.title}
            loading="lazy"
            onError={hideBrokenImage}
            className="w-full h-full object-cover opacity-18 blur-xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-950/88 via-neutral-950/78 to-neutral-900/70"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(226,114,91,0.18),transparent_36%),radial-gradient(circle_at_76%_26%,rgba(120,140,180,0.16),transparent_34%)]"></div>
        </div>

        {/* Absolute Exit button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white/55 hover:text-white transition-colors cursor-pointer z-20"
        >
          <X size={15} />
        </button>

        {/* Layout Grid container */}
        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 mt-4 md:mt-6 overflow-y-auto cinema-scrollbar">
          
          {/* Left Column: Vertical cinema poster */}
          <div className="w-[180px] md:w-[220px] shrink-0 mx-auto md:mx-0">
            <div className="relative aspect-[2/3] rounded-[24px] overflow-hidden border border-white/10 shadow-2xl group">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={hideBrokenImage}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                <button
                  onClick={() => onPlayTrailer(movie)}
                  className="px-4 py-2 rounded-full bg-brand-coral text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-lg"
                >
                  <Play size={10} className="fill-neutral-950 text-neutral-950" />
                  Watch Trailer / 预告片
                </button>
              </div>
            </div>
            
            {/* Meta status values */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-2 justify-between bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl font-mono text-[11px] text-white/60">
                <span className="flex items-center gap-1"><Heart size={12} className="text-brand-coral fill-brand-coral/20" /> Likes</span>
                <span className="text-white font-bold">{movie.likesCount}</span>
              </div>
              <div className="flex items-center gap-2 justify-between bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl font-mono text-[11px] text-white/60">
                <span className="flex items-center gap-0.5"><Languages size={12} className="text-zinc-400" /> Audio</span>
                <span className="text-white font-bold uppercase">{movie.language}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Text metadata info */}
          <div className="flex-1 flex flex-col gap-4 text-white">
            <div>
              {/* Year & Grade row */}
              <div className="flex items-center gap-3 mb-1.5 text-xs font-mono font-semibold">
                <span className="text-brand-coral flex items-center gap-1">
                  <Star size={12} className="fill-brand-coral" />
                  IMDb {movie.rating.toFixed(1)}
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/60">{movie.year}</span>
                <span className="text-white/40">•</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px]">
                  {movie.maturityRating}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl md:text-2xl font-serif font-extrabold tracking-tight mb-2 leading-tight">
                {movie.title}
              </h3>

              {/* Tag Badges Row */}
              <div className="flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/5 text-[10px] text-white/80 font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            <div className="flex flex-col gap-1.5 border-t border-white/[0.05] pt-3">
              <h4 className="text-xs uppercase font-extrabold text-white/40 tracking-wider">
                简介
              </h4>
              <p className="text-xs md:text-sm text-white/70 leading-relaxed font-light">
                {movie.synopsis}
              </p>
            </div>

            {/* Where to Watch / Available On */}
            <div className="flex flex-col gap-2 border-t border-white/[0.05] pt-3">
              <h4 className="text-xs uppercase font-extrabold text-brand-coral tracking-wider flex items-center gap-1.5 font-sans">
                <Tv size={13} className="text-brand-coral animate-pulse" />
                播放和订阅平台
              </h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {movie.platforms && movie.platforms.length > 0 ? (
                  movie.platforms.map((platform) => {
                    const searchUrl = getPlatformSearchUrl(platform, movie.title);
                    const platformContent = (
                      <>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          platform.type === "netflix" ? "bg-red-500" :
                          platform.type === "prime" ? "bg-blue-400" :
                          platform.type === "disney" ? "bg-indigo-400" :
                          platform.type === "apple" ? "bg-zinc-300" :
                          platform.type === "hbo" ? "bg-purple-400" :
                          platform.type === "hulu" ? "bg-emerald-400" :
                          platform.type === "crunchyroll" ? "bg-orange-400" :
                          "bg-sky-400"
                        }`} />
                        <span className="text-white/95">{platform.name}</span>
                        <span className="text-[9px] text-white/40 font-mono font-medium">({platform.priceInfo})</span>
                        {searchUrl && <ExternalLink size={10} className="text-white/45" />}
                      </>
                    );

                    return searchUrl ? (
                      <a
                        key={platform.name}
                        href={searchUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => onWatchPlatform?.(movie)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all text-xs font-semibold cursor-pointer"
                        title={`在 ${platform.name} 搜索 ${movie.title}`}
                      >
                        {platformContent}
                      </a>
                    ) : (
                      <button
                        key={platform.name}
                        onClick={() => onWatchPlatform?.(movie)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all text-xs font-semibold cursor-pointer"
                      >
                        {platformContent}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-white/40 italic">请查询当地院线，流媒体细节待更新。</span>
                )}
              </div>
            </div>

            {/* Crew credits */}
            <div className="grid grid-cols-2 gap-3 border-t border-white/[0.05] pt-3 text-[11px]">
              <div className="flex flex-col gap-0.5">
                <span className="text-white/40 uppercase font-bold text-[10px] tracking-wider flex items-center gap-1">
                  <Film size={11} className="text-brand-coral" />
                  导演
                </span>
                <span className="text-white/80 font-medium">{movie.director}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-white/40 uppercase font-bold text-[10px] tracking-wider flex items-center gap-1">
                  <User size={11} className="text-brand-coral" />
                  主要演员
                </span>
                <span className="text-white/80 font-medium truncate" title={movie.cast.join(", ")}>
                  {movie.cast.join(", ")}
                </span>
              </div>
            </div>

            {/* Similar Recommendation list inside modal */}
            <div className="border-t border-white/[0.05] pt-3 flex flex-col gap-2">
              <span className="text-[10px] uppercase font-extrabold text-white/40 tracking-wider flex items-center gap-1.5">
                <Sparkles size={11} className="text-brand-coral" />
                推荐相似
              </span>

              {similarMovies.length === 0 ? (
                <p className="text-[11px] text-white/30 font-medium">抱歉，目前库里没有匹配的相似影片。</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {similarMovies.map((similar) => (
                    <div
                      key={similar.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onChangeMovie(similar);
                        }
                      }}
                      onClick={() => onChangeMovie(similar)}
                      className="group/similar cursor-pointer bg-white/[0.02] border border-white/[0.04] rounded-xl p-1.5 flex flex-col gap-1.5 hover:bg-white/[0.06] hover:border-white/[0.08] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
                    >
                      <div className="aspect-[3/2] rounded-lg overflow-hidden relative">
                        <img
                          src={similar.backdropUrl}
                          alt={similar.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={hideBrokenImage}
                          className="w-full h-full object-cover group-hover/similar:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="min-w-0 px-0.5 mb-1 text-left">
                        <p className="text-white font-semibold text-[10px] truncate group-hover/similar:text-brand-coral transition-colors">
                          {similar.title}
                        </p>
                        <span className="text-[9px] font-mono text-white/30">
                          {similar.year}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Play button row */}
            <div className="flex justify-end gap-3 pt-3 mt-auto">
              <button
                onClick={() => onPlayTrailer(movie)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-coral hover:bg-brand-coral/90 text-neutral-950 text-xs font-bold transition-all shadow-lg shadow-brand-coral/10 hover:shadow-brand-coral/30 cursor-pointer"
              >
                <Play size={12} className="fill-neutral-950 text-neutral-950" />
                观看预告片
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
