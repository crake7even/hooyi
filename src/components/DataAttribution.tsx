const tmdbLogoUrl = "https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg";

export default function DataAttribution() {
  return (
    <footer
      className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/55 sm:flex-row sm:items-center sm:justify-between"
      aria-label="数据来源与署名"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
          aria-label="访问 The Movie Database"
        >
          <img src={tmdbLogoUrl} alt="TMDB" className="h-3.5 w-auto" loading="lazy" />
        </a>
        <span>影片数据与图片来自 TMDB；播放平台信息由 JustWatch 提供。</span>
        <a
          href="https://www.justwatch.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg px-2 font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral"
        >
          JustWatch
        </a>
      </div>
      <p className="max-w-xl text-white/40">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </footer>
  );
}
