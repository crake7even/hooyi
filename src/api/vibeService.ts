import { FilterState, Movie } from "../types";

const API_BASE_URL = (((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || "http://localhost:3001").replace(/\/$/, "");

export interface VibeResponse {
  need?: string;
  recommendations?: Array<{
    rank: number;
    movieId: string;
    title: string;
    match: number;
    reason: string;
    feeling: string;
  }>;
  tonightPick?: {
    movieId: string;
    title: string;
    reason: string;
  };
  error?: string;
}

export async function requestVibeRecommendation(
  message: string,
  movies: Movie[],
  filters: FilterState,
): Promise<VibeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/vibe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      movies,
      filters,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `VIBE request failed: ${response.status}`);
  }

  return data;
}
