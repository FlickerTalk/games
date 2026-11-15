import { isPlain } from "./curve.js";

export function checkStars(stars) {
  const { two, three } = isPlain(stars) ? stars : {};
  if (!Number.isFinite(two) || !Number.isFinite(three)) throw new TypeError("a game's stars need the scores for two and three as numbers");
  if (three <= two) throw new TypeError("three stars need a higher score than two");
  return Object.freeze({ two, three });
}

export function starsFor(score, { two, three }) {
  if (!Number.isFinite(score)) return 1;
  if (score >= three) return 3;
  return score >= two ? 2 : 1;
}
