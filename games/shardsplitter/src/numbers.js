export function isPrime(value) {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let factor = 2; factor * factor <= value; factor += 1) if (value % factor === 0) return false;
  return true;
}

export const usefulFor = (value, hand, cap = null) => hand.filter((divisor) => divisor !== cap && value % divisor === 0);

export function endsOf(value, hand, cap = null, seen = new Map()) {
  if (seen.has(value)) return seen.get(value);
  const ends = new Set();
  const useful = usefulFor(value, hand, cap);
  if (!useful.length) ends.add(value);
  for (const divisor of useful) for (const end of endsOf(value / divisor, hand, cap, seen)) ends.add(end);
  seen.set(value, ends);
  return ends;
}

export function fewestHits(value, hand, cap = null) {
  const useful = usefulFor(value, hand, cap);
  return useful.length ? 1 + Math.min(...useful.map((divisor) => fewestHits(value / divisor, hand, cap))) : 0;
}

export function standingMost(value, hand, cap = null, count = 1) {
  const here = value > 1 ? count : 0;
  return Math.max(here, ...usefulFor(value, hand, cap).map((divisor) => standingMost(value / divisor, hand, cap, count * divisor)));
}

export function splitsCleanly(number, hand, cap = null) {
  const free = [...endsOf(number, hand)];
  if (free.length !== 1 || free[0] === number || !(free[0] === 1 || isPrime(free[0]))) return false;
  if (cap === null) return true;
  const capped = [...endsOf(number, hand, cap)];
  return capped.length === 1 && capped[0] === free[0];
}
