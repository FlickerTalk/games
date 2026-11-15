import { isPlain } from "./curve.js";

function fits({ even, full, slowest, fastest }) {
  return [even, full, slowest, fastest].every(Number.isFinite) && even >= 0 && full > even && slowest > 0 && slowest <= 1 && fastest >= 1;
}

export function rivalPace(gap, band) {
  const { even, full, slowest = 0.8, fastest = 1.2 } = isPlain(band) ? band : {};
  if (!fits({ even, full, slowest, fastest })) {
    throw new TypeError("a rival's band needs even of 0 or more, full above even, slowest from 0 to 1 and fastest of 1 or more");
  }
  if (!Number.isFinite(gap)) return 1;
  const share = Math.min(1, Math.max(0, (Math.abs(gap) - even) / (full - even)));
  return 1 + share * ((gap > 0 ? slowest : fastest) - 1);
}
