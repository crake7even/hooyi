import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Fullscreen, X, RotateCcw, Settings, Check, Monitor, EyeOff, Tv, MessageSquareDot } from "lucide-react";

interface VideoPlayerModalProps {
  videoUrl: string;
  title: string;
  movieTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoPlayerModal({
  videoUrl,
  title,
  movieTitle,
  isOpen,
  onClose,
}: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [resolution, setResolution] = useState("1080p");
  const [subtitles, setSubtitles] = useState("English");
  const [showSettings, setShowSettings] = useState(false);
  const [theatreMode, setTheatreMode] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Restart video states on URL change
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(true);
      setCurrentTime(0);
      setIsBuffering(true);
    } else {
      setIsPlaying(false);
    }
  }, [videoUrl, isOpen]);

  // Video element player handlers
  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 120); // Fallback to 120 secs if invalid
      setIsBuffering(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current && duration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickPos = (e.clientX - rect.left) / rect.width;
      const targetTime = clickPos * duration;
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Skip 10s forward/back
  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    }
  };

  // Convert seconds to beautiful 00:00 notation
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xl animate-fade-in">
      
      {/* Outer ambient room projection */}
      <div className={`absolute inset-0 bg-radial transition-all duration-1000 pointer-events-none ${
        theatreMode ? "bg-gradient-to-b from-brand-bronze-dark/30 to-neutral-950" : "bg-neutral-950/40"
      }`}></div>

      {/* Floating Modal Frame */}
      <div className="relative w-full max-w-4xl rounded-3xl overflow-hidden glass-panel-heavy shadow-2xl z-25 flex flex-col scale-in">
        
        {/* Dynamic header row */}
        <div className="flex items-center justify-between p-4 bg-neutral-900/60 border-b border-white/[0.05] relative z-20">
          <div className="flex flex-col min-w-0 text-left">
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-coral font-mono">
              🎬 Now Playing Official Trailer / 正在播放官方预告片
            </span>
            <h2 className="text-white font-serif font-extrabold text-sm md:text-base truncate tracking-tight pr-10">
              {title} <span className="text-white/40 font-sans font-normal">({movieTitle})</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Theatre Mode Toggle */}
            <button
              onClick={() => setTheatreMode(!theatreMode)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                theatreMode ? "bg-brand-coral/20 text-brand-coral" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}
              title="Theatre Stage Light Toggle"
            >
              <Tv size={15} />
            </button>
            
            {/* Direct Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
              title="Close Player"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Cinematic Stage Area */}
        <div className="relative bg-neutral-950 aspect-video flex items-center justify-center group overflow-hidden">
          
          {/* Active Ambient Halo projection behind video */}
          {theatreMode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
              <div className="w-[80%] h-[80%] bg-brand-coral/10 rounded-full blur-[100px] animate-pulse-slow"></div>
            </div>
          )}

          {/* Buffering Loading Spinner */}
          {isBuffering && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-30">
              <div className="w-10 h-10 rounded-full border-[3px] border-brand-coral/20 border-t-brand-coral animate-spin"></div>
              <p className="text-xs text-white/60 font-medium tracking-wide">Buffering high definition stream...</p>
            </div>
          )}

          {/* HTML5 raw video tag element */}
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            autoPlay
            className="w-full h-full object-contain relative z-10"
            onClick={handleTogglePlay}
          />

          {/* Simulated floating English/Custom Subtitles track */}
          {isPlaying && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-2 rounded-xl bg-neutral-950/80 border border-white/5 backdrop-blur-md text-white text-xs md:text-sm text-center font-medium shadow-lg max-w-[80%]">
              {currentTime < 4 ? "This content is powered by high resolution CDN streaming." : ""}
              {currentTime >= 4 && currentTime < 8 ? `Discover your next favourite cinematic experience on 好影 Hooyi.` : ""}
              {currentTime >= 8 && currentTime < 12 ? `Currently screening: "${movieTitle}" with spatial visual ambiance.` : ""}
              {currentTime >= 12 && currentTime < 16 ? `Adjust filters in real-time to find similar ${resolution} releases.` : ""}
              {currentTime >= 16 ? "The metadata, cast list, and download parameters are loaded natively." : ""}
            </div>
          )}

          {/* Center Play Overlay Button on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-150 transition-opacity duration-300 flex items-center justify-center z-20 pointer-events-none">
            <button
              onClick={handleTogglePlay}
              className="w-14 h-14 rounded-full bg-black/55 hover:bg-brand-coral border border-white/10 backdrop-blur-md text-white flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all pointer-events-auto"
            >
              {isPlaying ? <Pause size={20} className="fill-white" /> : <Play size={20} className="fill-white translate-x-px" />}
            </button>
          </div>

          {/* Video Control HUD Strip Overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 z-20 flex flex-col gap-3 group-hover:translate-y-0 translate-y-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            
            {/* Seeking progress slider bar */}
            <div
              ref={progressRef}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={currentTime}
              aria-label="Video progress"
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  handleSkip(10);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  handleSkip(-10);
                }
              }}
              onClick={handleSeek}
              className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full overflow-hidden cursor-pointer transition-all relative flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral z-10"
            >
              {/* Buffer track slider */}
              <div className="absolute inset-y-0 left-0 bg-white/10 w-[70%]" />
              
              {/* Progress fill slider bar */}
              <div
                className="h-full bg-brand-coral relative rounded-full"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              >
                {/* Floating focus orb */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white scale-0 group-hover/progress:scale-100 transition-transform" />
              </div>
            </div>

            {/* Controls Button Row */}
            <div className="flex items-center justify-between">
              
              {/* Playback Controls Left Panel */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePlay}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={14} className="fill-white" /> : <Play size={14} className="fill-white translate-x-px" />}
                </button>

                <button
                  onClick={() => handleSkip(-10)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer text-xs font-mono font-bold"
                  title="Rewind 10s"
                >
                  -10s
                </button>
                <button
                  onClick={() => handleSkip(10)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer text-xs font-mono font-bold"
                  title="Forward 10s"
                >
                  +10s
                </button>

                {/* Sound Controls container */}
                <div className="flex items-center gap-2 relative group/volume">
                  <button
                    onClick={handleToggleMute}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-0 scale-x-0 group-hover/volume:w-16 group-hover/volume:scale-x-100 origin-left transition-all duration-300 h-1 rounded-lg accent-brand-coral bg-white/25 cursor-pointer appearance-none"
                  />
                </div>

                {/* Time Display */}
                <span className="text-[10px] font-mono text-white/60 font-semibold select-none ml-2">
                  {formatTime(currentTime)} <span className="text-white/20">/</span> {formatTime(duration)}
                </span>
              </div>

              {/* Preferences / Setup Right Panel */}
              <div className="flex items-center gap-2.5 relative">
                
                {/* Settings Panel Toggle */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer ${
                    showSettings ? "bg-white/15" : ""
                  }`}
                  title="Playback Preferences & Subtitles"
                >
                  <Settings size={14} />
                </button>

                {/* Floating Settings Dropdown popup drawer inside player */}
                {showSettings && (
                  <div className="absolute right-0 bottom-10 z-30 w-52 p-3 rounded-2xl bg-neutral-950 border border-white/10 shadow-2xl flex flex-col gap-3 text-left">
                    {/* Resolution Section */}
                    <div>
                      <p className="text-[9px] uppercase font-bold text-white/40 tracking-wider mb-1.5 flex items-center gap-1">
                        <Monitor size={10} />
                        Resolution
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {["Auto", "720p", "1080p"].map((res) => (
                          <button
                            key={res}
                            onClick={() => {
                              setResolution(res);
                              setIsBuffering(true);
                              setTimeout(() => setIsBuffering(false), 900);
                            }}
                            className={`px-1 py-1 rounded-md text-[9px] font-bold transition-all text-center ${
                              resolution === res ? "bg-brand-coral text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                            }`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subtitles Section */}
                    <div>
                      <p className="text-[9px] uppercase font-bold text-white/40 tracking-wider mb-1.5 flex items-center gap-1">
                        <MessageSquareDot size={10} />
                        Captions (CC)
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {["Off", "English", "Japanese"].map((sub) => (
                          <button
                            key={sub}
                            onClick={() => setSubtitles(sub)}
                            className={`px-1 py-1 rounded-md text-[9px] font-bold transition-all text-center ${
                              subtitles === sub ? "bg-brand-coral text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Native Fullscreen expand */}
                <button
                  onClick={handleFullscreen}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize size={14} className="scale-95" />
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Quick info metadata footer row inside Modal */}
        <div className="p-4 bg-neutral-900/30 border-t border-white/[0.04] text-left">
          <p className="text-white/40 text-[11px] leading-relaxed">
            💡 <span className="font-semibold text-white/60">放映说明：</span>当前播放为官方预告片。本站为电影检索与筛选工具，不提供完整正片在线播放，旨在为您提供最准确的官方授权观看、购买与订阅平台指引。
          </p>
        </div>

      </div>
    </div>
  );
}
