import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, CheckCircle2, Mic, Sparkles, Tv } from "lucide-react";
import { requestVibeRecommendation, VibeResponse } from "../api/vibeService";
import { FilterState, Movie, WatchPlatform } from "../types";
import { hideBrokenImage } from "./imageFallback";

interface VibePromptProps {
  themeMode: "night" | "day";
  movies: Movie[];
  filters: FilterState;
  onDetails: (movie: Movie) => void;
}

const placeholders = [
  "最近压力很大，想看点能让我松一口气的...",
  "想找一部能让我哭出来，但哭完会舒服一点的...",
  "最近很迷茫，想看点有后劲的...",
  "今晚只想爽一下，不想动脑...",
];

function platformDotClass(platform: WatchPlatform) {
  if (platform.type === "netflix") return "bg-red-500";
  if (platform.type === "prime") return "bg-blue-400";
  if (platform.type === "disney") return "bg-indigo-400";
  if (platform.type === "apple") return "bg-zinc-300";
  if (platform.type === "hbo") return "bg-purple-400";
  if (platform.type === "hulu") return "bg-emerald-400";
  if (platform.type === "crunchyroll") return "bg-orange-400";
  if (platform.type === "paramount") return "bg-sky-400";
  return "bg-brand-coral";
}

function AnimatedEllipsis() {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDotCount((count) => (count + 1) % 4);
    }, 450);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="inline-block w-[1.2em] text-left" aria-hidden="true">
      {".".repeat(dotCount)}
    </span>
  );
}

export default function VibePrompt({ themeMode, movies, filters, onDetails }: VibePromptProps) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<VibeResponse | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = placeholders[value.length % placeholders.length];
  const availableMovies = useMemo(() => {
    const movieMap = new Map<string, Movie>();
    for (const movie of [...movies, ...(result?.movies || [])]) {
      movieMap.set(movie.id, movie);
    }
    return Array.from(movieMap.values());
  }, [movies, result?.movies]);
  const movieById = useMemo(() => new Map(availableMovies.map((movie) => [movie.id, movie])), [availableMovies]);
  const movieByTitle = useMemo(
    () => new Map(availableMovies.map((movie) => [movie.title.trim().toLowerCase(), movie])),
    [availableMovies],
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  const getRecommendedMovie = (movieId?: string, title?: string) => {
    return movieById.get(movieId || "") || movieByTitle.get((title || "").trim().toLowerCase());
  };

  const submitVibe = async () => {
    const message = value.trim();
    if (!message || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const nextResult = await requestVibeRecommendation(message, movies, filters);
      setResult(nextResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "VIBE 请求失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitVibe();
    }
  };

  const hasRecommendations = Boolean(result?.recommendations?.length);
  const tonightMovie = getRecommendedMovie(result?.tonightPick?.movieId, result?.tonightPick?.title);

  return (
    <div className="flex-1 w-full min-h-[500px] lg:min-h-[650px] flex flex-col justify-between gap-5 p-4 md:p-6 shrink-0 relative animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      <div className="flex-1 min-h-0 flex items-center justify-center">
        {isSubmitting ? (
          <div className="flex flex-col items-center justify-center gap-5 text-center">
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-white tracking-tight">
              正在理解此刻的你<AnimatedEllipsis />
            </h2>
            <h2 className="hidden">
              正在理解此刻的你<AnimatedEllipsis />
            </h2>
            <h2 className="hidden">
              正在理解此刻的你
            </h2>
          </div>
        ) : error ? (
          <div className="w-full max-w-2xl text-center rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl px-6 py-8 shadow-2xl">
            <p className="text-brand-coral text-xs font-mono font-bold uppercase mb-3">VIBE FAILED</p>
            <p className="text-white/75 text-sm leading-relaxed">{error}</p>
          </div>
        ) : hasRecommendations ? (
          <div className="w-full h-full max-h-full overflow-y-auto scrollbar-none pr-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-6xl mx-auto flex flex-col gap-4 pb-1">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.07] backdrop-blur-2xl p-5 md:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
                <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-coral mb-2">
                  你现在最需要的是
                </p>
                <h2 className="text-xl md:text-3xl font-serif font-bold text-white leading-tight">
                  {result?.need}
                </h2>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 md:gap-4">
                {result?.recommendations?.slice(0, 4).map((item) => {
                  const movie = getRecommendedMovie(item.movieId, item.title);
                  const platforms = movie?.platforms?.slice(0, 3) || [];

                  return (
                    <button
                      key={`${item.rank}-${item.movieId || item.title}`}
                      type="button"
                      onClick={() => {
                        if (movie) onDetails(movie);
                      }}
                      disabled={!movie}
                      className="rounded-[24px] border border-white/[0.08] bg-white/[0.045] backdrop-blur-xl p-3 md:p-4 text-left shadow-xl transition-all hover:bg-white/[0.07] hover:border-white/[0.16] active:scale-[0.99] flex flex-col sm:flex-row sm:items-center gap-4 md:gap-5 min-h-[300px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral animate-in fade-in slide-in-from-bottom-4 duration-700 disabled:cursor-default"
                      style={{ animationDelay: `${item.rank * 70}ms` }}
                    >
                      <div className="relative w-full max-w-[150px] sm:w-[132px] md:w-[150px] mx-auto sm:mx-0 aspect-[2/3] rounded-[18px] overflow-hidden bg-neutral-950/80 border border-white/10 shadow-lg shrink-0">
                        {movie?.posterUrl ? (
                          <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={hideBrokenImage}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/[0.04]">
                            <Sparkles size={22} className="text-brand-coral" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/65 border border-white/10 text-white/85 text-[9px] font-mono font-bold">
                          {String(item.rank).padStart(2, "0")}
                        </div>
                      </div>

                      <div className="min-w-0 flex flex-col gap-3 flex-1 py-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-lg md:text-xl font-serif font-extrabold text-white leading-tight line-clamp-2">
                              《{movie?.title || item.title}》
                            </h3>
                            {movie && (
                              <p className="text-[10px] text-white/42 font-mono mt-1 truncate">
                                {movie.year} / {movie.genres.slice(0, 2).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 px-2.5 py-1 rounded-full bg-brand-coral/15 border border-brand-coral/25 text-brand-coral text-[11px] font-mono font-bold">
                            {item.match}%
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-white/35 mb-1">
                            推荐理由
                          </p>
                          <p className="text-xs md:text-sm text-white/72 leading-relaxed line-clamp-4">
                            {item.reason}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/[0.06]">
                          <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-white/35 mb-1">
                            你会获得
                          </p>
                          <p className="text-xs md:text-sm text-white/80 leading-relaxed line-clamp-2">
                            {item.feeling}
                          </p>
                        </div>

                        <div className="mt-auto flex flex-wrap gap-1.5">
                          {platforms.length > 0 ? platforms.map((platform) => (
                            <span
                              key={`${item.movieId}-${platform.name}`}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/75 font-semibold max-w-full"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${platformDotClass(platform)}`} />
                              <span className="truncate">{platform.name}</span>
                            </span>
                          )) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/42 font-semibold">
                              <Tv size={10} className="text-brand-coral" />
                              平台待更新
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (tonightMovie) onDetails(tonightMovie);
                }}
                disabled={!tonightMovie}
                className="rounded-[26px] border border-brand-coral/25 bg-brand-coral/[0.08] backdrop-blur-2xl p-4 md:p-5 text-left shadow-2xl transition-all hover:bg-brand-coral/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral animate-in fade-in slide-in-from-bottom-4 duration-700 disabled:cursor-default"
                style={{ animationDelay: "360ms" }}
              >
                <div className="flex items-center gap-4">
                  {tonightMovie?.posterUrl && (
                    <div className="hidden sm:block w-14 h-20 rounded-xl overflow-hidden border border-white/10 bg-neutral-900 shrink-0">
                      <img
                        src={tonightMovie.posterUrl}
                        alt={tonightMovie.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={hideBrokenImage}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CheckCircle2 size={20} className="text-brand-coral shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-coral mb-1">
                      如果今晚只能看一部
                    </p>
                    <h3 className="text-xl md:text-2xl font-serif font-extrabold text-white leading-tight truncate mb-1">
                      《{tonightMovie?.title || result?.tonightPick?.title}》
                    </h3>
                    <p className="text-sm text-white/76 leading-relaxed line-clamp-2">
                      {result?.tonightPick?.reason}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center flex flex-col items-center gap-4">
            <h2 className="text-3xl md:text-5xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/55 tracking-tight pb-2 leading-relaxed">
              说出此刻，匹配今晚
            </h2>
          </div>
        )}
      </div>

      <div
        className="w-full max-w-3xl mx-auto relative rounded-[32px] p-3 flex flex-col justify-end transition-all duration-300 group focus-within:shadow-2xl shrink-0"
        style={{
          boxShadow: themeMode === "night"
            ? "0 20px 50px rgba(0, 0, 0, 0.5), inset 1px 1px 1.5px 0 rgba(255, 255, 255, 0.2)"
            : "0 20px 50px rgba(0, 0, 0, 0.1), inset 1px 1px 2px 0 rgba(255, 255, 255, 0.4)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          background: themeMode === "night" ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.3)",
          border: themeMode === "night" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.4)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          className={`w-full min-h-[64px] max-h-[180px] bg-transparent outline-none resize-none px-5 py-4 text-base md:text-lg font-medium scrollbar-none transition-colors ${
            themeMode === "night" ? "text-white placeholder-white/30" : "text-black placeholder-black/30"
          }`}
          placeholder={placeholder}
          rows={1}
        />

        <div className="flex justify-between items-center px-4 pt-2 pb-1">
          <button
            className={`p-2 rounded-full transition-colors ${
              themeMode === "night" ? "hover:bg-white/10 text-white/60 hover:text-white" : "hover:bg-black/10 text-black/60 hover:text-black"
            }`}
            title="Use Voice"
            type="button"
          >
            <Mic size={20} />
          </button>

          <button
            onClick={() => {
              void submitVibe();
            }}
            disabled={!value.trim() || isSubmitting}
            type="button"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              value.trim() && !isSubmitting
                ? themeMode === "night"
                  ? "bg-white text-black hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  : "bg-black text-white hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
                : themeMode === "night"
                  ? "bg-white/10 text-white/30 cursor-not-allowed"
                  : "bg-black/10 text-black/30 cursor-not-allowed"
            }`}
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
