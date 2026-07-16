import fs from "node:fs/promises";
import path from "node:path";
import { filterDemoSafeMovies } from "../server-safety";

const cacheFiles = [
  path.resolve("data", "tmdb-movies-cache.json"),
  path.resolve("public", "tmdb-movies-cache.json"),
];

for (const cacheFile of cacheFiles) {
  const raw = await fs.readFile(cacheFile, "utf8");
  const payload = JSON.parse(raw) as { updatedAt?: string; movies?: unknown[] };
  const movies = Array.isArray(payload.movies)
    ? payload.movies as Array<{ id?: unknown; title?: unknown; synopsis?: unknown; maturityRating?: unknown }>
    : [];
  const sanitizedMovies = filterDemoSafeMovies(movies, true);
  await fs.writeFile(
    cacheFile,
    `${JSON.stringify({ ...payload, movies: sanitizedMovies }, null, 2)}\n`,
    "utf8",
  );
  console.log(`${path.relative(process.cwd(), cacheFile)}: ${movies.length} -> ${sanitizedMovies.length}`);
}
