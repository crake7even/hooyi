export type WatchPlatformType =
  | "netflix"
  | "prime"
  | "disney"
  | "apple"
  | "hbo"
  | "hulu"
  | "theaters"
  | "crunchyroll"
  | "paramount";

export interface WatchPlatform {
  name: string;
  type: WatchPlatformType;
  priceInfo?: string; // e.g., "Subscription", "Rent/Buy", "In Theaters", "Streaming Free"
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  genres: string[];
  rating: number; // IMDb rating, e.g. 8.9
  duration: string; // e.g., "2h 20m"
  director: string;
  cast: string[];
  synopsis: string;
  posterUrl: string; // Vertical poster image
  backdropUrl: string; // Horizontal banner image
  trailerUrl: string; // Video or placeholder stream
  trending: boolean;
  language: string;
  maturityRating: string; // e.g. "PG-13", "R"
  likesCount: string; // e.g., "12.4K"
  platforms?: WatchPlatform[];
}

export interface Trailer {
  id: string;
  title: string;
  movieTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  uploadedAt: string; // e.g., "Today", "2 days ago"
}

export interface ContinueWatching {
  id: string;
  title: string;
  episodeInfo: string; // e.g., "Episode 3", "32min 12sec"
  progress: number; // 0 to 100 representing percentage watched
  thumbnailUrl: string;
}

export interface FilterState {
  searchQuery: string;
  selectedGenre: string; // "All" or a specific genre
  yearRange: [number, number]; // [minYear, maxYear]
  minRating: number; // Minimum IMDb rating
  language: string; // "All" or language code
  sortBy: "popular" | "newest" | "rating";
  selectedPlatform?: WatchPlatformType | null; // Selected streaming platform identifier
}
