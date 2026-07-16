import React, { useState, useRef, useEffect } from "react";
import { Movie } from "../types";
import { Trash2, CheckCircle2, Library, MoreHorizontal } from "lucide-react";
import { hideBrokenImage } from "./imageFallback";

interface ListManagementViewProps {
  title: string;
  movies: Movie[];
  onRemove: (ids: string[]) => void;
  onDetails: (movie: Movie) => void;
}

export default function ListManagementView({ title, movies, onRemove, onDetails }: ListManagementViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggledDuringDragRef = useRef<Set<string>>(new Set());
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
    setIsMenuOpen(false);
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setIsDragSelecting(false);
    toggledDuringDragRef.current.clear();
  };

  const handleDeleteSelected = () => {
    onRemove(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setIsDragSelecting(false);
    toggledDuringDragRef.current.clear();
  };

  const handleDragStart = (id: string) => {
    if (!isSelectionMode) return;
    toggledDuringDragRef.current = new Set([id]);
    suppressNextClickRef.current = true;
    setIsDragSelecting(true);
    handleToggleSelect(id);
  };

  const handleDragEnter = (id: string) => {
    if (!isSelectionMode || !isDragSelecting || toggledDuringDragRef.current.has(id)) return;
    toggledDuringDragRef.current.add(id);
    handleToggleSelect(id);
  };

  return (
    <div
      className="w-full flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500 h-full min-h-[500px]"
      onMouseUp={() => {
        setIsDragSelecting(false);
        toggledDuringDragRef.current.clear();
      }}
      onMouseLeave={() => {
        setIsDragSelecting(false);
        toggledDuringDragRef.current.clear();
      }}
    >
      <div className="mb-6 flex justify-between items-center px-4 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/40 tracking-tight flex items-center gap-3">
          {title}
          {isSelectionMode && selectedIds.size > 0 && (
            <span className="text-brand-coral text-sm font-medium">已选出 {selectedIds.size} 项</span>
          )}
          {isSelectionMode && (
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="h-11 w-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 transition-colors text-red-500 disabled:text-white/20 disabled:hover:bg-white/5 disabled:hover:border-white/10 disabled:cursor-not-allowed"
              title="删除已选"
              aria-label="删除已选"
            >
              <Trash2 size={17} />
            </button>
          )}
        </h2>
        {movies.length > 0 && (
          <div className="relative" ref={menuRef}>
            {isSelectionMode ? (
              <button
                onClick={handleExitSelectionMode}
                className="px-4 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white text-sm font-medium"
              >
                取消
              </button>
            ) : (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white"
              >
                <MoreHorizontal size={20} />
              </button>
            )}
            
            {!isSelectionMode && isMenuOpen && (
              <div className="absolute top-12 right-0 bg-[#232323] border border-white/10 rounded-2xl shadow-2xl p-1.5 min-w-[140px] z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={handleEnterSelectionMode}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium flex items-center justify-between"
                >
                  选择
                  <CheckCircle2 size={16} className="text-white/50" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {movies.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto px-4 pb-12">
          {movies.map((movie) => {
            const isSelected = selectedIds.has(movie.id);
            return (
              <div
                key={movie.id}
                className="relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral rounded-2xl"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (isSelectionMode) {
                      handleToggleSelect(movie.id);
                    } else {
                      onDetails(movie);
                    }
                  }
                }}
                onClick={() => {
                  if (isSelectionMode) {
                    if (suppressNextClickRef.current) {
                      suppressNextClickRef.current = false;
                      return;
                    }
                    handleToggleSelect(movie.id);
                  } else {
                    onDetails(movie);
                  }
                }}
                onMouseDown={(e) => {
                  if (isSelectionMode && e.button === 0) {
                    e.preventDefault();
                    handleDragStart(movie.id);
                  }
                }}
                onMouseEnter={() => handleDragEnter(movie.id)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-20 drop-shadow-md">
                    <CheckCircle2 size={24} className="fill-brand-coral text-white border-none" />
                  </div>
                )}
                
                <div>
                  <div className={`relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 transition-all duration-300 ${isSelected ? "ring-2 ring-brand-coral scale-[0.96] opacity-80" : ""}`}>
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={hideBrokenImage}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                  <h3 className="font-bold text-white text-sm truncate">{movie.title}</h3>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-white/40 pb-20">
          <Library size={48} className="mb-4 opacity-30" />
          <p>列表空空如也，快去探索吧！</p>
        </div>
      )}
    </div>
  );
}
