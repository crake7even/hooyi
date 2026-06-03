import React, { useState, useEffect, useRef } from "react";
import { motion, PanInfo, useMotionValue, useTransform, useAnimation } from "motion/react";
import { Movie } from "../types";

interface TinderSwipeDeckProps {
  movies: Movie[];
  resetKey?: string;
  onDetails: (movie: Movie) => void;
  onAddToWatchlist?: (movie: Movie) => void;
}

export default function TinderSwipeDeck({ movies, resetKey, onDetails, onAddToWatchlist }: TinderSwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [resetKey]);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, Math.max(movies.length - 1, 0)));
  }, [movies.length]);

  if (movies.length === 0) {
    return (
      <div className="flex-1 w-full flex items-center justify-center p-10 min-h-[500px]">
        <p className="text-white/50 text-sm font-mono">抱歉，未找到匹配的电影...</p>
      </div>
    );
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 < 0 ? movies.length - 1 : prev - 1));
  };

  return (
    <div className="relative flex-1 w-full outline-none h-auto min-h-[500px] lg:min-h-[650px] flex flex-col items-center justify-center overflow-hidden z-10 p-4 pb-24">
      <div className="relative w-full max-w-[300px] md:max-w-[360px] lg:max-w-[400px] h-[480px] md:h-[540px] lg:h-[600px] perspective-1000 mb-8">
        {movies.map((movie, index) => {
          let diff = index - currentIndex;
          if (diff < 0) diff += movies.length;
          const isVisible = diff <= 2;
          
          if (!isVisible) return null;

          return (
            <TinderCard
              key={`${movie.id}-${index}`}
              movie={movie}
              diff={diff}
              isCurrent={diff === 0}
              isNext1={diff === 1}
              onDetails={onDetails}
              onSwipeLeft={handleNext}
              onSwipeRight={handlePrev}
              onSwipeUp={handleNext}
              onSwipeDown={() => {
                if (onAddToWatchlist) onAddToWatchlist(movie);
                handleNext();
              }}
            />
          );
        })}
      </div>
      
      <div className="absolute bottom-4 inset-x-0 px-6 flex flex-col items-center gap-4 opacity-70 pointer-events-none z-0">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 text-[11px] md:text-xs font-mono font-medium text-white/60">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><div className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-white shadow-sm flex items-center justify-center">←</div> 上一部</span>
            <span className="flex items-center gap-2">下一部 <div className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-white shadow-sm flex items-center justify-center">→</div></span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/20 hidden md:block" />
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><div className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-white shadow-sm flex items-center justify-center">↑</div> 不感兴趣</span>
            <span className="flex items-center gap-2"><div className="px-2 py-0.5 rounded-md border border-brand-coral/30 bg-brand-coral/10 text-brand-coral shadow-sm flex items-center justify-center">↓</div> 待看</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TinderCardProps {
  key?: string | number;
  movie: Movie;
  diff: number;
  isCurrent: boolean;
  isNext1: boolean;
  onDetails: (movie: Movie) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
}

function TinderCard({ movie, diff, isCurrent, isNext1, onDetails, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown }: TinderCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragConstraintsRef = useRef(null);
  
  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);

  // Reset state when card cycles
  useEffect(() => {
    if (!isCurrent) {
      setExitX(0);
      setExitY(0);
      x.set(0);
      y.set(0);
    }
  }, [isCurrent]);

  // Rotate based on drag X
  const rotateZ = useTransform(x, [-200, 200], [-10, 10]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    const velocityThreshold = 500;
    const exitAnimationMs = 200;
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
        setTimeout(onSwipeDown, exitAnimationMs);
        return;
      }

      if (hasUpIntent) {
        setExitY(-1000);
        setTimeout(onSwipeUp, exitAnimationMs);
        return;
      }

      if (offset.x > 0 || velocity.x > velocityThreshold) {
        setExitX(1000);
        setTimeout(onSwipeRight, exitAnimationMs);
      } else {
        setExitX(-1000);
        setTimeout(onSwipeLeft, exitAnimationMs);
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
      className={`absolute inset-0 w-full h-full rounded-[36px] shadow-2xl shadow-black/80 border border-white/10 cursor-grab active:cursor-grabbing p-4 md:p-5 flex flex-col ${isCurrent ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{
        zIndex: 10 - diff,
        backgroundColor: "rgba(15, 15, 20, 0.92)",
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
        y: diff === 0 ? 0 : diff === 1 ? 20 : 40,
      }}
      animate={{
        scale: isCurrent ? 1 : isNext1 ? 0.95 : 0.9,
        opacity: isCurrent ? 1 : isNext1 ? 0.8 : 0.5,
        x: isCurrent ? exitX : 0,
        y: isCurrent ? exitY : isNext1 ? 20 : 40,
        rotate: isCurrent ? (exitX ? exitX / 20 : (exitY ? exitY / 40 : 0)) : 0,
      } as any}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 25,
      }}
    >
      <div 
        className="w-full h-full relative group flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral rounded-[32px]"
        role="button"
        tabIndex={isCurrent ? 0 : -1}
        onKeyDown={(e) => {
          if (isCurrent && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
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
            className="w-full h-full object-cover select-none pointer-events-none group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            draggable={false}
            referrerPolicy="no-referrer"
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
