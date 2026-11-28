import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

const tmdbLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg";

interface DataAttributionProps {
  themeMode?: "night" | "day";
  /** icon：放在顶部工具区的小图标按钮，浮层向下展开 */
  variant?: "footer" | "icon";
}

export default function DataAttribution({ themeMode = "night", variant = "footer" }: DataAttributionProps) {
  const isIcon = variant === "icon";
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <footer className={isIcon ? "contents" : "mt-1 flex justify-end"} aria-label="数据来源与署名">
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          title={isIcon ? "数据来源" : undefined}
          aria-label={isIcon ? "数据来源" : undefined}
          className={
            isIcon
              ? "flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.08] text-white/75 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              : `inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral ${
                  themeMode === "day"
                    ? "bg-neutral-950/55 text-white/90 hover:bg-neutral-950/65"
                    : "text-white/55 hover:bg-white/10"
                }`
          }
        >
          <Info size={isIcon ? 17 : 13} strokeWidth={isIcon ? 1.9 : 2} />
          {!isIcon && "数据来源"}
        </button>

        {isOpen && (
          <div
            id={panelId}
            role="dialog"
            aria-label="数据来源与署名"
            className={`absolute ${isIcon ? "top-full mt-3" : "bottom-full mb-2"} right-0 z-40 w-72 max-w-[calc(100vw-3rem)] p-3 rounded-2xl bg-neutral-950 border border-white/10 shadow-2xl flex flex-col gap-2 text-left text-[11px] leading-relaxed text-white/75 animate-in fade-in duration-200`}
          >
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-fit items-center rounded-lg px-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
              aria-label="访问 The Movie Database"
            >
              <img src={tmdbLogoUrl} alt="TMDB" className="h-3.5 w-auto" loading="lazy" />
            </a>
            <p className="px-2">影片数据与图片来自 TMDB；播放平台信息由 JustWatch 提供。</p>
            <p className="px-2 text-white/60">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
            <a
              href="https://www.justwatch.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-fit items-center rounded-lg px-2 font-bold text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
            >
              JustWatch
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
