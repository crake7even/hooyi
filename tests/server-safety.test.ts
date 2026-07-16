import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientInputError,
  VIBE_MESSAGE_MAX_LENGTH,
  createFixedWindowLimiter,
  filterDemoSafeMovies,
  parseVibeRequestBody,
} from "../server-safety";

test("parseVibeRequestBody trims and sanitizes client data", () => {
  const result = parseVibeRequestBody({
    message: "  想看轻松喜剧  ",
    movies: [{ id: "1", title: "测试电影", synopsis: "x".repeat(1200), rating: 99 }],
    filters: { minRating: 20, sortBy: "rating" },
  });

  assert.equal(result.message, "想看轻松喜剧");
  assert.equal(result.movies[0].synopsis.length, 800);
  assert.equal(result.movies[0].rating, 10);
  assert.equal(result.filters.minRating, 10);
});

test("parseVibeRequestBody rejects empty and oversized messages", () => {
  assert.throws(() => parseVibeRequestBody({ message: "" }), ClientInputError);
  assert.throws(
    () => parseVibeRequestBody({ message: "x".repeat(VIBE_MESSAGE_MAX_LENGTH + 1) }),
    /characters or fewer/,
  );
});

test("fixed window limiter blocks requests over the configured limit", () => {
  const limiter = createFixedWindowLimiter(2, 1000);
  assert.equal(limiter.consume("client", 0).allowed, true);
  assert.equal(limiter.consume("client", 1).allowed, true);
  assert.equal(limiter.consume("client", 2).allowed, false);
  assert.equal(limiter.consume("client", 1000).allowed, true);
});

test("demo-safe filtering excludes known explicit catalog entries", () => {
  const movies = [
    { id: "532794", title: "blocked", synopsis: "" },
    { id: "1", title: "safe", synopsis: "普通电影简介" },
  ];

  assert.deepEqual(filterDemoSafeMovies(movies, true).map((movie) => movie.id), ["1"]);
  assert.equal(filterDemoSafeMovies(movies, false).length, 2);
});
