import React, { memo, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { motion, PanInfo, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { ChevronLeft, ChevronRight, Heart, RotateCcw, X } from "lucide-react";
import { Movie } from "../types";
import { hideBrokenImage } from "./imageFallback";

export type SwipeAction = "next" | "prev" | "dismiss" | "add";

interface TinderSwipeDeckProps {
  movies: Movie[];
  resetKey?: string;
  keyboardEnabled?: boolean;
  onDetails: (movie: Movie) => void;
  onAddToWatchlist?: (movie: Movie) => void;
  onDismiss?: (movie: Movie) => void;
  onUndo?: (movie: Movie, action: "add" | "dismiss") => void;
  onNewRound?: () => void;
}

const defaultAccent = {
  rgb: "226, 114, 91",
  border: "rgba(226, 114, 91, 0.34)",
  glow: "rgba(226, 114, 91, 0.26)",
};

type PosterAccent = typeof defaultAccent;

// One extraction per poster URL for the whole session.
const accentCache = new Map<string, Promise<PosterAccent>>();
const resolvedAccents = new Map<string, PosterAccent>();

const scheduleIdle = (callback: () => void) => {
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) {
    idle(callback, { timeout: 600 });
  } else {
    window.setTimeout(callback, 50);
  }
};

function extractPosterAccent(src: string): Promise<PosterAccent> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(defaultAccent);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 36;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve(defaultAccent);
          return;
        }

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
          resolve(defaultAccent);
          return;
        }

        const red = Math.round(r / count);
        const green = Math.round(g / count);
        const blue = Math.round(b / count);

        resolve({
          rgb: `${red}, ${green}, ${blue}`,
          border: `rgba(${red}, ${green}, ${blue}, 0.42)`,
          glow: `rgba(${red}, ${green}, ${blue}, 0.30)`,
        });
      } catch {
        resolve(defaultAccent);
      }
    };

    image.onerror = () => resolve(defaultAccent);
    image.src = src;
  });
}

function getPosterAccent(src: string) {
  let cached = accentCache.get(src);
  if (!cached) {
    cached = extractPosterAccent(src).then((accent) => {
      resolvedAccents.set(src, accent);
      return accent;
    });
    accentCache.set(src, cached);
  }
  return cached;
}

// Decode upcoming posters ahead of time so they never pop in after the card appears.
const decodedPosters = new Set<string>();
function preloadPoster(src: string) {
  if (!src || decodedPosters.has(src)) return;
  decodedPosters.add(src);
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  image.decode?.().catch(() => undefined);
}

interface Ghost {
  id: number;
  movie: Movie;
  action: SwipeAction;
  fromX: number;
  fromY: number;
  revealed: boolean;
}

interface DeckState {
  movies: Movie[];
  index: number;
  ghosts: Ghost[];
  nextGhostId: number;
}

type DeckEvent =
  | { type: "reset"; movies: Movie[] }
  | { type: "swipe"; action: SwipeAction; fromX: number; fromY: number }
  | { type: "ghostDone"; id: number }
  | { type: "ghostRevealed"; id: number }
  | { type: "restore"; movie: Movie; index: number };

const clampIndex = (index: number, length: number) => Math.min(Math.max(index, 0), Math.max(length - 1, 0));

// The deck advances immediately; the card that left is drawn as a separate "ghost" that flies out on top.
function deckReducer(state: DeckState, event: DeckEvent): DeckState {
  switch (event.type) {
    case "reset":
      return { ...state, movies: event.movies, index: 0, ghosts: [] };
    case "swipe": {
      const { movies, index } = state;
      const movie = movies[index];
      if (!movie) return state;
      let nextMovies = movies;
      let nextIndex = index;

      if (event.action === "next") {
        nextIndex = (index + 1) % movies.length;
      } else if (event.action === "prev") {
        nextIndex = (index - 1 + movies.length) % movies.length;
      } else {
        nextMovies = movies.filter((_, position) => position !== index);
        nextIndex = clampIndex(index, nextMovies.length);
      }

      const ghost: Ghost = { id: state.nextGhostId, movie, action: event.action, fromX: event.fromX, fromY: event.fromY, revealed: false };
      return {
        movies: nextMovies,
        index: nextIndex,
        ghosts: [...state.ghosts, ghost],
        nextGhostId: state.nextGhostId + 1,
      };
    }
    case "ghostRevealed":
      return { ...state, ghosts: state.ghosts.map((ghost) => (ghost.id === event.id ? { ...ghost, revealed: true } : ghost)) };
    case "ghostDone":
      return { ...state, ghosts: state.ghosts.filter((ghost) => ghost.id !== event.id) };
    case "restore": {
      if (state.movies.some((movie) => movie.id === event.movie.id)) return state;
      const insertAt = Math.min(event.index, state.movies.length);
      const movies = [...state.movies.slice(0, insertAt), event.movie, ...state.movies.slice(insertAt)];
      return { ...state, movies, index: insertAt, ghosts: [] };
    }
    default:
      return state;
  }
}

interface UndoToast {
  movie: Movie;
  action: "add" | "dismiss";
  index: number;
}

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

const actionButtonClass =
  "flex-1 min-h-11 min-w-11 px-2 md:px-4 py-2 rounded-xl border text-xs md:text-sm font-bold transition-all cursor-pointer active:scale-95 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral";
const neutralButtonClass = "bg-neutral-950/30 border-white/15 text-white hover:bg-neutral-950/45";
const accentButtonClass = "bg-brand-coral/90 border-brand-coral text-white hover:bg-brand-coral shadow-lg shadow-brand-coral/25";

export default function TinderSwipeDeck({
  movies,
  resetKey,
  keyboardEnabled = true,
  onDetails,
  onAddToWatchlist,
  onDismiss,
  onUndo,
  onNewRound,
}: TinderSwipeDeckProps) {
  const [state, dispatch] = useReducer(deckReducer, { movies, index: 0, ghosts: [], nextGhostId: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;
  const interactedRef = useRef(false);
  const [toast, setToast] = useState<UndoToast | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // A new round (explicit reset) always rebuilds the deck.
  useEffect(() => {
    interactedRef.current = false;
    dispatch({ type: "reset", movies });
    setToast(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Background catalog refreshes only fill the deck before the user starts this round.
  useEffect(() => {
    if (!interactedRef.current) {
      dispatch({ type: "reset", movies });
    }
  }, [movies]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      rootRef.current?.scrollIntoView({ block: "start" });
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const enqueue = useCallback(
    (action: SwipeAction, from?: { x: number; y: number }) => {
      const { movies: deck, index } = stateRef.current;
      const movie = deck[index];
      if (!movie) return;
      interactedRef.current = true;

      if (action === "add") {
        onAddToWatchlist?.(movie);
        setToast({ movie, action: "add", index });
      } else if (action === "dismiss") {
        onDismiss?.(movie);
        setToast({ movie, action: "dismiss", index });
      }
      dispatch({ type: "swipe", action, fromX: from?.x ?? 0, fromY: from?.y ?? 0 });
    },
    [onAddToWatchlist, onDismiss],
  );

  const handleGhostDone = useCallback((id: number) => dispatch({ type: "ghostDone", id }), []);
  const handleGhostRevealed = useCallback((id: number) => dispatch({ type: "ghostRevealed", id }), []);

  const handleUndo = () => {
    if (!toast) return;
    dispatch({ type: "restore", movie: toast.movie, index: toast.index });
    onUndo?.(toast.movie, toast.action);
    setToast(null);
  };

  const { movies: deckMovies, index: currentIndex, ghosts } = state;
  const ghostMovieIds = new Set(ghosts.filter((ghost) => !ghost.revealed).map((ghost) => ghost.movie.id));
  const currentMovie = deckMovies[currentIndex];

  useEffect(() => {
    if (!keyboardEnabled || !currentMovie) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      const keyActions: Record<string, SwipeAction> = {
        ArrowLeft: "prev",
        ArrowRight: "next",
        ArrowUp: "dismiss",
        ArrowDown: "add",
      };
      const action = keyActions[event.key];

      if (action) {
        event.preventDefault();
        enqueue(action);
        return;
      }

      if (event.key === "Enter") {
        const target = event.target as HTMLElement | null;
        if (target && target.closest("button, a, [role=button]")) return;
        event.preventDefault();
        onDetails(currentMovie);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, currentMovie, enqueue, onDetails]);

  // Decode the next two posters and the previous one ahead of time.
  useEffect(() => {
    if (deckMovies.length === 0) return;
    for (const offset of [1, 2, -1]) {
      const movie = deckMovies[(currentIndex + offset + deckMovies.length) % deckMovies.length];
      if (movie) preloadPoster(movie.posterUrl);
    }
  }, [deckMovies, currentIndex]);

  if (deckMovies.length === 0) {
    return (
      <div ref={rootRef} className="flex-1 w-full flex flex-col items-center justify-center gap-4 p-10 min-h-[420px] text-center">
        <p className="text-white text-lg font-bold">这一轮已经刷完了</p>
        <p className="text-white/75 text-sm">再来一轮，会按你刚才的喜好重新挑选。</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {toast && (
            <button type="button" onClick={handleUndo} className={`${actionButtonClass} flex-none ${neutralButtonClass}`}>
              <RotateCcw size={16} />
              撤销上一步
            </button>
          )}
          <button type="button" onClick={onNewRound} className={`${actionButtonClass} flex-none px-6 ${accentButtonClass}`}>
            <RotateCcw size={16} />
            再来一轮
          </button>
        </div>
      </div>
    );
  }

  const prevIndex = (currentIndex - 1 + deckMovies.length) % deckMovies.length;

  return (
    <div ref={rootRef} className="relative flex-1 w-full flex flex-col items-center justify-start gap-5 overflow-hidden z-10 p-2 md:p-4 fit:min-h-0">
      <div className="relative w-auto max-w-full aspect-[2/3] h-[clamp(300px,calc(100svh_-_170px),600px)] lg:h-[clamp(320px,calc(100svh_-_370px),600px)] fit:!h-[min(600px,calc(100%_-_4rem))] perspective-1000">
        {deckMovies.map((movie, index) => {
          let diff = index - currentIndex;
          if (index === prevIndex && index !== currentIndex) {
            diff = -1;
          } else if (diff < 0) {
            diff += deckMovies.length;
          }
          if (diff < -1 || diff > 2) return null;

          return (
            <TinderCard
              key={movie.id}
              movie={movie}
              diff={diff}
              hidden={ghostMovieIds.has(movie.id)}
              onDetails={onDetails}
              onIntent={enqueue}
            />
          );
        })}
        {ghosts.map((ghost) => (
          <GhostCard key={`ghost-${ghost.id}`} ghost={ghost} onDone={handleGhostDone} onRevealed={handleGhostRevealed} />
        ))}
        <div className="absolute inset-x-0 bottom-3 z-30 flex justify-center px-3 pointer-events-none" aria-live="polite">
          {toast && (
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-neutral-950/85 backdrop-blur-sm pl-4 pr-1 py-1 text-sm text-white shadow-xl">
              <span className="line-clamp-1">
                {toast.action === "add" ? "已加入待看" : "已标记不感兴趣"} · {toast.movie.title}
              </span>
              <button
                type="button"
                onClick={handleUndo}
                className="min-h-9 px-3 rounded-full font-bold text-brand-coral hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              >
                撤销
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-20 w-full max-w-[520px] grid grid-cols-4 gap-2 md:gap-3" role="group" aria-label="随心一刷操作">
        <button type="button" onClick={() => enqueue("prev")} className={`${actionButtonClass} ${neutralButtonClass}`} aria-keyshortcuts="ArrowLeft">
          <ChevronLeft size={18} />
          上一部
        </button>
        <button type="button" onClick={() => enqueue("dismiss")} className={`${actionButtonClass} ${neutralButtonClass}`} aria-keyshortcuts="ArrowUp">
          <X size={18} />
          不感兴趣
        </button>
        <button type="button" onClick={() => enqueue("add")} className={`${actionButtonClass} ${accentButtonClass}`} aria-keyshortcuts="ArrowDown">
          <Heart size={18} />
          加入待看
        </button>
        <button type="button" onClick={() => enqueue("next")} className={`${actionButtonClass} ${neutralButtonClass}`} aria-keyshortcuts="ArrowRight">
          下一部
          <ChevronRight size={18} />
        </button>
      </div>

    </div>
  );
}

interface TinderCardProps {
  movie: Movie;
  diff: number;
  hidden: boolean;
  onDetails: (movie: Movie) => void;
  onIntent: (action: SwipeAction, from: { x: number; y: number }) => void;
}

const cardBackground = (accent: PosterAccent) =>
  `linear-gradient(145deg, rgba(${accent.rgb}, 0.16), rgba(15, 15, 20, 0.94) 38%, rgba(10, 10, 15, 0.98))`;

function usePosterAccent(src: string) {
  const [accent, setAccent] = useState(() => resolvedAccents.get(src) ?? defaultAccent);
  useEffect(() => {
    const known = resolvedAccents.get(src);
    if (known) {
      setAccent(known);
      return;
    }
    let cancelled = false;
    scheduleIdle(() => {
      void getPosterAccent(src).then((value) => {
        if (!cancelled) setAccent(value);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return accent;
}

function CardFace({ movie, accent }: { movie: Movie; accent: PosterAccent }) {
  return (
    <>
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 8%, rgba(${accent.rgb}, 0.28), transparent 36%)` }}
      />
      <div className="w-full h-full relative flex flex-col pointer-events-none">
        <div className="w-full flex-1 min-h-0 rounded-[28px] md:rounded-[32px] overflow-hidden relative shadow-md bg-neutral-900 border border-white/5">
          <img src={movie.posterUrl} alt="" decoding="async" onError={hideBrokenImage} className="w-full h-full object-cover select-none" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        <div className="w-full pt-4 md:pt-6 pb-1 md:pb-2 px-2 flex flex-col gap-1.5 text-left shrink-0">
          <h2 className="text-white font-extrabold text-xl md:text-3xl leading-tight font-serif tracking-tight line-clamp-2">{movie.title}</h2>
          <p className="text-white/70 font-semibold text-xs md:text-sm uppercase tracking-widest font-mono line-clamp-1">{movie.genres.join(", ")}</p>
        </div>
      </div>
    </>
  );
}

const GhostCard = memo(function GhostCard({
  ghost,
  onDone,
  onRevealed,
}: {
  ghost: Ghost;
  onDone: (id: number) => void;
  onRevealed: (id: number) => void;
}) {
  const revealedRef = useRef(false);
  const accent = usePosterAccent(ghost.movie.posterUrl);
  const target = exitTargets[ghost.action];
  return (
    <motion.div
      aria-hidden="true"
      className="absolute inset-0 w-full h-full rounded-[36px] border p-4 md:p-5 flex flex-col overflow-hidden pointer-events-none"
      style={{
        zIndex: 20,
        background: cardBackground(accent),
        borderColor: accent.border,
        boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
        willChange: "transform, opacity",
      }}
      initial={{ x: ghost.fromX, y: ghost.fromY, rotate: ghost.fromX / 20, opacity: 1 }}
      animate={{ ...target, opacity: [1, 1, 0] }}
      // Near-constant speed so the card keeps the momentum of the flick; it only fades once it is mostly gone.
      transition={{
        default: { type: "tween", duration: 0.26, ease: [0.25, 0.5, 0.6, 1] },
        opacity: { duration: 0.26, times: [0, 0.6, 1], ease: "linear" },
      }}
      onUpdate={(latest) => {
        // Once the ghost has mostly cleared the stack, let the card it covers settle in parallel.
        if (revealedRef.current) return;
        const travelled = Math.max(Math.abs(Number(latest.x) || 0), Math.abs(Number(latest.y) || 0));
        if (travelled > 420) {
          revealedRef.current = true;
          onRevealed(ghost.id);
        }
      }}
      onAnimationComplete={() => onDone(ghost.id)}
    >
      <CardFace movie={ghost.movie} accent={accent} />
    </motion.div>
  );
});

const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

const exitTargets: Record<SwipeAction, { x: number; y: number; rotate: number }> = {
  next: { x: -900, y: 0, rotate: -18 },
  prev: { x: 900, y: 0, rotate: 18 },
  dismiss: { x: 0, y: -900, rotate: 0 },
  add: { x: 0, y: 900, rotate: 0 },
};

const TinderCard = memo(function TinderCard({
  movie,
  diff,
  hidden,
  onDetails,
  onIntent,
}: TinderCardProps) {
  const isCurrent = diff === 0;
  const isNext1 = diff === 1;
  const isPrev = diff === -1;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const accent = usePosterAccent(movie.posterUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [armed, setArmed] = useState<"dismiss" | "add" | null>(null);

  useEffect(() => {
    if (!isCurrent) {
      x.set(0);
      y.set(0);
      setArmed(null);
    }
  }, [isCurrent, x, y]);

  useMotionValueEvent(y, "change", (value) => {
    const next = value <= -SWIPE_THRESHOLD ? "dismiss" : value >= SWIPE_THRESHOLD ? "add" : null;
    setArmed((current) => (current === next ? current : next));
  });

  const rotateZ = useTransform(x, [-200, 200], [-10, 10]);
  const dismissLabelOpacity = useTransform(y, [-SWIPE_THRESHOLD, -30], [1, 0]);
  const addLabelOpacity = useTransform(y, [30, SWIPE_THRESHOLD], [0, 1]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    const velX = Math.abs(velocity.x);
    const velY = Math.abs(velocity.y);
    const hasDownIntent = offset.y > SWIPE_THRESHOLD || (velocity.y > VELOCITY_THRESHOLD && absY > 40);
    const hasUpIntent = offset.y < -SWIPE_THRESHOLD || (velocity.y < -VELOCITY_THRESHOLD && absY > 40);
    const from = { x: x.get(), y: y.get() };

    if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD || velX > VELOCITY_THRESHOLD || velY > VELOCITY_THRESHOLD) {
      if (hasDownIntent) {
        onIntent("add", from);
      } else if (hasUpIntent) {
        onIntent("dismiss", from);
      } else if (offset.x > 0 || velocity.x > VELOCITY_THRESHOLD) {
        onIntent("prev", from);
      } else {
        onIntent("next", from);
      }
    }
  };

  const handleClick = () => {
    if (Math.abs(x.get()) < 5 && Math.abs(y.get()) < 5) {
      onDetails(movie);
    }
  };

  const shadow = !isCurrent
    ? "0 24px 70px rgba(0,0,0,0.42)"
    : isDragging
      ? "0 20px 48px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.18)"
      : `0 34px 90px rgba(0,0,0,0.58), 0 0 70px ${accent.glow}, inset 0 1px 1px rgba(255,255,255,0.18)`;

  const baseOpacity = isCurrent ? 1 : isNext1 || isPrev ? 0.82 : 0.5;

  return (
    <motion.div
      className={`absolute inset-0 w-full h-full rounded-[36px] border cursor-grab active:cursor-grabbing p-4 md:p-5 flex flex-col overflow-hidden ${
        isCurrent ? "pointer-events-auto" : "pointer-events-none"
      }`}
      style={{
        zIndex: isCurrent ? 10 : isNext1 ? 9 : isPrev ? 8 : 7,
        background: cardBackground(accent),
        borderColor: isCurrent ? accent.border : "rgba(255, 255, 255, 0.10)",
        boxShadow: shadow,
        // Own compositor layer: dragging only moves a cached bitmap instead of repainting poster + shadow every frame.
        willChange: isCurrent ? "transform" : undefined,
        x,
        y,
        rotate: rotateZ,
      }}
      drag={isCurrent}
      // Follow the pointer 1:1 and spring back to the origin when released below the threshold.
      dragSnapToOrigin
      dragElastic={1}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 320, bounceDamping: 26 }}
      onDragStart={isCurrent ? () => setIsDragging(true) : undefined}
      onDragEnd={isCurrent ? handleDragEnd : undefined}
      initial={{
        scale: 0.95,
        opacity: 0,
        x: diff === -1 ? -14 : 0,
        y: diff === 0 ? 0 : diff === 1 || diff === -1 ? 20 : 40,
      }}
      animate={{
        scale: isCurrent ? 1 : isNext1 || isPrev ? 0.95 : 0.9,
        opacity: hidden ? 0 : baseOpacity,
        x: isCurrent ? 0 : isPrev ? -14 : 0,
        y: isCurrent ? 0 : isNext1 || isPrev ? 20 : 40,
        rotate: isPrev ? -2 : 0,
      } as any}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 28,
        // The card returning to the "previous" slot fades back quickly instead of trailing after the swipe.
        opacity: { type: "tween", duration: hidden ? 0.08 : 0.16, ease: "easeOut" },
      }}
    >
      {isCurrent && (
        <>
          <motion.div
            aria-hidden="true"
            style={{ opacity: dismissLabelOpacity }}
            className={`absolute top-8 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full border-2 text-sm font-black tracking-wide pointer-events-none transition-colors ${
              armed === "dismiss" ? "bg-white text-neutral-900 border-white" : "bg-neutral-950/60 text-white border-white/70"
            }`}
          >
            不感兴趣
          </motion.div>
          <motion.div
            aria-hidden="true"
            style={{ opacity: addLabelOpacity }}
            className={`absolute bottom-28 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full border-2 text-sm font-black tracking-wide pointer-events-none transition-colors ${
              armed === "add" ? "bg-brand-coral text-white border-brand-coral" : "bg-neutral-950/60 text-brand-coral border-brand-coral/80"
            }`}
          >
            加入待看
          </motion.div>
        </>
      )}
      <div
        className="absolute inset-0 rounded-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral cursor-pointer z-10"
        role="button"
        aria-label={`查看《${movie.title}》详情`}
        tabIndex={isCurrent ? 0 : -1}
        onKeyDown={(event) => {
          if (isCurrent && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            handleClick();
          }
        }}
        onClick={() => isCurrent && handleClick()}
      />
      <CardFace movie={movie} accent={accent} />
    </motion.div>
  );
});
