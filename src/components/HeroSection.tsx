import React from "react";
import { ChevronLeft, ChevronRight, Tv } from "lucide-react";
import { Movie } from "../types";
import { hideBrokenImage } from "./imageFallback";

interface HeroSectionProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  onDetails: (movie: Movie) => void;
  onNext: () => void;
  onPrev: () => void;
  isSwitching?: boolean;
}

export default function HeroSection({ movie, onDetails, onNext, onPrev, isSwitching = false }: HeroSectionProps) {
  return (
    <div className="relative w-full aspect-auto h-[300px] md:h-[340px] lg:h-[380px] rounded-[32px] overflow-hidden group shadow-xl flex flex-col justify-between flex-shrink-0 p-6 md:p-8 xl:p-10">
      {/* Absolute Backdrop image */}
      <div className="absolute inset-0 bg-neutral-900 overflow-hidden">
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          loading="eager"
          referrerPolicy="no-referrer"
          onError={hideBrokenImage}
          className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-[8000ms] ease-out-sine opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/55 via-neutral-950/10 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/70 via-neutral-950/18 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/12 via-transparent to-transparent"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand-coral/10 rounded-full blur-[120px] pointer-events-none"></div>
      </div>

      {/* Top Header Row within Hero (Tags on left) */}
      <div className="relative z-10 w-full flex justify-between items-start gap-4 -mt-3 md:-mt-4 lg:-mt-5">
        {/* Left Side: Tags */}
        <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
          <span className="px-3 py-1.5 rounded-full bg-brand-coral/90 text-white font-bold text-[10px] md:text-[11px] tracking-wider uppercase font-mono shadow-sm flex items-center gap-1">
            🔥 焦点推荐
          </span>
          {movie.genres.map((genre) => (
            <span
              key={genre}
              className="hidden md:inline-flex px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] md:text-xs font-semibold tracking-wide"
            >
              {genre}
            </span>
          ))}
          <span className="px-2.5 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-brand-coral text-[10px] md:text-xs font-mono font-bold">
            IMDb {movie.rating}
          </span>
          <span className="px-2.5 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/70 text-[10px] md:text-xs font-mono font-medium">
            {movie.maturityRating}
          </span>
        </div>
      </div>

      {/* Bottom Main Metadata and Controls Container */}
      <div className="relative z-10 w-full flex justify-between items-end gap-4 mt-auto">
        {/* Metadata Text */}
        <div className="flex flex-col justify-end gap-3 md:gap-4 max-w-[95%] md:max-w-[75%] lg:max-w-[65%] border-0 text-left">
          {/* Huge Movie Title */}
          <h1 className="text-3xl md:text-4xl xl:text-5xl font-serif font-black text-white tracking-tight leading-tight md:leading-[1.1] drop-shadow-lg">
            {movie.title}
          </h1>

          {/* Metadata String */}
          <p className="text-white/70 text-xs md:text-sm font-mono font-semibold flex flex-wrap items-center gap-2 md:gap-3">
            <span className="whitespace-nowrap">{movie.year} 年首映</span>
            <span className="w-1 h-1 rounded-full bg-white/30 hidden sm:block"></span>
            <span className="whitespace-nowrap">{movie.duration}</span>
            <span className="w-1 h-1 rounded-full bg-white/30 hidden sm:block"></span>
            <span className="capitalize whitespace-nowrap">{movie.language === "en" ? "英语原音" : (movie.language === "ja" ? "日语原音" : `${movie.language.toUpperCase()} 原音`)}</span>
          </p>

          {/* Synopsis text */}
          <p className="text-white/80 text-xs md:text-sm lg:text-[15px] font-medium leading-relaxed max-w-2xl line-clamp-2 md:line-clamp-3 drop-shadow-md">
            {movie.synopsis}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onDetails(movie)}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-brand-coral hover:bg-orange-500 text-neutral-950 text-[13px] font-extrabold transition-all transform hover:scale-[1.02] shadow-xl shadow-brand-coral/20"
            >
              <Tv size={16} className="stroke-[2.5]" />
              播放和订阅平台
            </button>
          </div>
        </div>

        {/* Right Side: Navigation Controls */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/40 shadow-lg shrink-0 mb-1 md:mb-2 mr-1 md:mr-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={onPrev}
            disabled={isSwitching}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl hover:bg-white/30 flex items-center justify-center text-white drop-shadow-md hover:scale-105 transition-all ${
              isSwitching ? "cursor-wait opacity-60" : "cursor-pointer"
            }`}
            title="前一部焦点电影"
          >
            <ChevronLeft size={20} className="stroke-[2.5]" />
          </button>
          <button
            onClick={onNext}
            disabled={isSwitching}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl hover:bg-white/30 flex items-center justify-center text-white drop-shadow-md hover:scale-105 transition-all ${
              isSwitching ? "cursor-wait opacity-60" : "cursor-pointer"
            }`}
            title="下一部焦点电影"
          >
            <ChevronRight size={20} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
