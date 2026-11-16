import { isPlain } from "./curve.js";

export function checkStars(stars) {
  const { two, three } = isPlain(stars) ? stars : {};
  if (!Number.isFinite(two) || !Number.isFinite(three)) throw new TypeError("a game's stars need the scores for two and three as numbers");
  if (three <= two) throw new TypeError("three stars need a higher score than two");
  return Object.freeze({ two, three });
}

export function checkTracks(tracks) {
  const names = isPlain(tracks) ? Object.keys(tracks) : [];
  if (!names.length || !names.every((name) => name.length > 0 && name.length <= 64)) {
    throw new TypeError("a game's tracks are an object of names, each with its stars: { two, three }");
  }
  return Object.freeze(Object.fromEntries(names.map((name) => [name, checkStars(tracks[name])])));
}

export function starsFor(score, { two, three }) {
  if (!Number.isFinite(score)) return 1;
  if (score >= three) return 3;
  return score >= two ? 2 : 1;
}
