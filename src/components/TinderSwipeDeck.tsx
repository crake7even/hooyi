import React, { useEffect, useRef, useState } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "motion/react";
import { Movie } from "../types";
import { hideBrokenImage } from "./imageFallback";

interface TinderSwipeDeckProps {
  movies: Movie[];
  resetKey?: string;
  onDetails: (movie: Movie) => void;
  onAddToWatchlist?: (movie: Movie) => void;
  onDismiss?: (movie: Movie) => void;
}

const defaultAccent = {
  rgb: "226, 114, 91",
  border: "rgba(226, 114, 91, 0.34)",
  glow: "rgba(226, 114, 91, 0.26)",
};

type PosterAccent = typeof defaultAccent;

function extractPosterAccent(src: string, onColor: (accent: PosterAccent) => void) {
  const image = new Image();
  image.crossOrigin = "anonymous";

  image.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      const size = 36;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      context.drawImage(image, 0, 0, size, size);
      const { data } = context.getImageData(0, 0, size, size);
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let index = 0; index < data.length; index += 16) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const brightness = (red + green + blue) / 3;
        const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);

        if (brightness < 35 || brightness > 235 || saturation < 18) continue;

        r += red;
        g += green;
        b += blue;
        count += 1;
      }

      if (!count) {
        onColor(defaultAccent);
        return;
      }

      const red = Math.round(r / count);
      const green = Math.round(g / count);
      const blue = Math.round(b / count);

      onColor({
        rgb: `${red}, ${green}, ${blue}`,
        border: `rgba(${red}, ${green}, ${blue}, 0.42)`,
        glow: `rgba(${red}, ${green}, ${blue}, 0.30)`,
      });
    } catch {
      onColor(defaultAccent);
    }
  };

  image.onerror = () => onColor(defaultAccent);
  image.src = src;
}

export default function TinderSwipeDeck({
  movies,
  resetKey,
  onDetails,
  onAddToWatchlist,
  onDismiss,
}: TinderSwipeDeckProps) {
  const [deckMovies, setDeckMovies] = useState<Movie[]>(movies);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDeckMovies(movies);
    setCurrentIndex(0);
  }, [resetKey]);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, Math.max(deckMovies.length - 1, 0)));
  }, [deckMovies.length]);

  if (deckMovies.length === 0) {
    return (
      <div className="flex-1 w-full flex items-center justify-center p-10 min-h-[500px]">
        <p className="text-white/50 text-sm font-mono">No cards left in this round.</p>
      </div>
    );
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % deckMovies.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 < 0 ? deckMovies.length - 1 : prev - 1));
  };

  const removeMovieFromDeck = (movie: Movie) => {
    setDeckMovies((prev) => {
      const next = prev.filter((item) => item.id !== movie.id);
      setCurrentIndex((current) => Math.min(current, Math.max(next.length - 1, 0)));
      return next;
    });
  };

  return (
    <div className="relative flex-1 w-full outline-none h-auto min-h-[500px] lg:min-h-[650px] flex flex-col items-center justify-center overflow-hidden z-10 p-4 pb-24">
      <div className="relative w-full max-w-[300px] md:max-w-[360px] lg:max-w-[400px] h-[480px] md:h-[540px] lg:h-[600px] perspective-1000 mb-8">
        {deckMovies.map((movie, index) => {
          const prevIndex = (currentIndex - 1 + deckMovies.length) % deckMovies.length;
          let diff = index - currentIndex;
          if (index === prevIndex && index !== currentIndex) {
            diff = -1;
          } else if (diff < 0) {
            diff += deckMovies.length;
          }
          const isVisible = diff >= -1 && diff <= 2;

          if (!isVisible) return null;

          return (
            <TinderCard
              key={movie.id}
              movie={movie}
              diff={diff}
              isCurrent={diff === 0}
              isNext1={diff === 1}
              isPrev={diff === -1}
              onDetails={onDetails}
              onSwipeLeft={handleNext}
              onSwipeRight={handlePrev}
              onSwipeUp={() => {
                onDismiss?.(movie);
                removeMovieFromDeck(movie);
              }}
              onSwipeDown={() => {
                onAddToWatchlist?.(movie);
                removeMovieFromDeck(movie);
              }}
            />
          );
        })}
      </div>

      <div className="absolute bottom-4 inset-x-0 px-6 flex flex-col items-center gap-4 opacity-70 pointer-events-none z-0">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 text-[11px] md:text-xs font-mono font-medium text-white/60">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-white shadow-sm">左</span> 上一部</span>
            <span className="flex items-center gap-2">下一部<span className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-white shadow-sm">右</span></span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/20 hidden md:block" />
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-white shadow-sm">上</span> 不感兴趣</span>
            <span className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-md border border-brand-coral/30 bg-brand-coral/10 text-brand-coral shadow-sm">下</span> 加入待看</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TinderCardProps {
  movie: Movie;
  diff: number;
  isCurrent: boolean;
  isNext1: boolean;
  isPrev: boolean;
  onDetails: (movie: Movie) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
}

function TinderCard({
  movie,
  diff,
  isCurrent,
  isNext1,
  isPrev,
  onDetails,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
}: TinderCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragConstraintsRef = useRef(null);
  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);
  const [accent, setAccent] = useState(defaultAccent);

  useEffect(() => {
    extractPosterAccent(movie.posterUrl, setAccent);
  }, [movie.posterUrl]);

  useEffect(() => {
    if (!isCurrent) {
      setExitX(0);
      setExitY(0);
      x.set(0);
      y.set(0);
    }
  }, [isCurrent, x, y]);

  const rotateZ = useTransform(x, [-200, 200], [-10, 10]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    const velocityThreshold = 500;
    const exitAnimationMs = 230;
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    const velX = Math.abs(velocity.x);
    const velY = Math.abs(velocity.y);
    const hasDownIntent = offset.y > threshold || (velocity.y > velocityThreshold && absY > 40);
    const hasUpIntent = offset.y < -threshold || (velocity.y < -velocityThreshold && absY > 40);

    if (absX > threshold || absY > threshold || velX > velocityThreshold || velY > velocityThreshold) {
      if (hasDownIntent) {
        setExitY(1000);
        window.setTimeout(onSwipeDown, exitAnimationMs);
        return;
      }

      if (hasUpIntent) {
        setExitY(-1000);
        window.setTimeout(onSwipeUp, exitAnimationMs);
        return;
      }

      if (offset.x > 0 || velocity.x > velocityThreshold) {
        setExitX(1000);
        window.setTimeout(onSwipeRight, exitAnimationMs);
      } else {
        setExitX(-1000);
        window.setTimeout(onSwipeLeft, exitAnimationMs);
      }
    }
  };

  const handleClick = () => {
    if (Math.abs(x.get()) < 5 && Math.abs(y.get()) < 5) {
      onDetails(movie);
    }
  };

  return (
    <motion.div
      ref={dragConstraintsRef}
      className={`absolute inset-0 w-full h-full rounded-[36px] border cursor-grab active:cursor-grabbing p-4 md:p-5 flex flex-col overflow-hidden ${
        isCurrent ? "pointer-events-auto" : "pointer-events-none"
      }`}
      style={{
        zIndex: isCurrent ? 10 : isNext1 ? 9 : isPrev ? 8 : 7,
        background: `linear-gradient(145deg, rgba(${accent.rgb}, 0.16), rgba(15, 15, 20, 0.94) 38%, rgba(10, 10, 15, 0.98))`,
        borderColor: isCurrent ? accent.border : "rgba(255, 255, 255, 0.10)",
        boxShadow: isCurrent
          ? `0 34px 90px rgba(0,0,0,0.58), 0 0 70px ${accent.glow}, inset 0 1px 1px rgba(255,255,255,0.18)`
          : "0 24px 70px rgba(0,0,0,0.42)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        x,
        y,
        rotate: rotateZ,
      }}
      drag={isCurrent && exitX === 0 && exitY === 0}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={isCurrent ? handleDragEnd : undefined}
      initial={{
        scale: 0.95,
        opacity: 0,
        x: diff === -1 ? -14 : 0,
        y: diff === 0 ? 0 : diff === 1 || diff === -1 ? 20 : 40,
      }}
      animate={{
        scale: isCurrent ? 1 : isNext1 || isPrev ? 0.95 : 0.9,
        opacity: isCurrent ? 1 : isNext1 || isPrev ? 0.82 : 0.5,
        x: isCurrent ? exitX : isPrev ? -14 : 0,
        y: isCurrent ? exitY : isNext1 || isPrev ? 20 : 40,
        rotate: isCurrent ? (exitX ? exitX / 20 : (exitY ? exitY / 40 : 0)) : isPrev ? -2 : 0,
      } as any}
      transition={{
        type: "spring",
        stiffness: 210,
        damping: 26,
      }}
    >
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 8%, rgba(${accent.rgb}, 0.28), transparent 36%)`,
        }}
      />
      <div
        className="w-full h-full relative group flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral rounded-[32px]"
        role="button"
        tabIndex={isCurrent ? 0 : -1}
        onKeyDown={(event) => {
          if (isCurrent && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            handleClick();
          }
        }}
        onClick={() => isCurrent && handleClick()}
      >
        <div className="w-full flex-1 rounded-[28px] md:rounded-[32px] overflow-hidden relative shadow-md bg-neutral-900 border border-white/5">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            loading={isCurrent ? "eager" : "lazy"}
            onError={hideBrokenImage}
            className="w-full h-full object-cover select-none pointer-events-none group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 transition-opacity pointer-events-none" />
        </div>

        <div className="w-full pt-6 pb-2 px-2 flex flex-col gap-1.5 pointer-events-none text-left shrink-0">
          <h2 className="text-white font-extrabold text-2xl md:text-3xl leading-tight font-serif tracking-tight line-clamp-2">
            {movie.title}
          </h2>
          <p className="text-white/60 font-semibold text-xs md:text-sm uppercase tracking-widest font-mono line-clamp-1">
            {movie.genres.join(", ")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
