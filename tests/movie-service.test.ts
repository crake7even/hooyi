import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortMovies, parseLikesCount } from "../src/api/movieService";
import type { FilterState, Movie } from "../src/types";

const baseMovie: Movie = {
  id: "1",
  title: "测试电影",
  year: 2024,
  genres: ["剧情"],
  rating: 8,
  duration: "2小时",
  director: "导演",
  cast: ["演员"],
  synopsis: "简介",
  posterUrl: "",
  backdropUrl: "",
  trailerUrl: "",
  trending: false,
  language: "zh",
  maturityRating: "PG-13",
  likesCount: "1.2万",
};

const baseFilters: FilterState = {
  searchQuery: "",
  selectedGenre: "全部",
  yearRange: [1900, 2100],
  minRating: 0,
  language: "All",
  sortBy: "popular",
  selectedPlatform: null,
};

test("parseLikesCount supports Chinese and abbreviated counts", () => {
  assert.equal(parseLikesCount("1.2万"), 12_000);
  assert.equal(parseLikesCount("3K"), 3_000);
  assert.equal(parseLikesCount("invalid"), 0);
});

test("filterAndSortMovies applies genre, year and rating filters", () => {
  const result = filterAndSortMovies(
    [baseMovie, { ...baseMovie, id: "2", year: 1990, rating: 6, genres: ["喜剧"] }],
    { ...baseFilters, selectedGenre: "剧情", yearRange: [2020, 2026], minRating: 7 },
    {},
  );

  assert.deepEqual(result.map((movie) => movie.id), ["1"]);
});

test("personalized genre score affects popular ordering", () => {
  const comedy = { ...baseMovie, id: "2", genres: ["喜剧"], likesCount: "1" };
  const result = filterAndSortMovies([baseMovie, comedy], baseFilters, { 喜剧: 500 });
  assert.equal(result[0].id, "2");
});
