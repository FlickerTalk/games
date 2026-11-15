export const LONGEST_ROUND_SECONDS = 90;
export const HALFWAY_FROM_SECONDS = 60;
export const EASE_AFTER_LOSSES = 2;

const OPENING = [35, 40, 45, 55, 45, 50, 60, 70, 55, 65, 75, 90];
const CYCLE = [60, 70, 80, 90];

export const wholeFrom = (value, least) => (Number.isFinite(value) && value >= least ? Math.floor(value) : least);

function planned(level) {
  const seconds = level <= OPENING.length ? OPENING[level - 1] : CYCLE[(level - OPENING.length - 1) % CYCLE.length];
  return Math.min(LONGEST_ROUND_SECONDS, seconds);
}

export function roundSeconds(level, lossesInARow = 0) {
  const whole = wholeFrom(level, 1);
  const own = planned(whole);
  if (wholeFrom(lossesInARow, 0) < EASE_AFTER_LOSSES || whole === 1) return own;
  return Math.min(own, planned(whole - 1));
}

export function hasHalfway(seconds) {
  return seconds >= HALFWAY_FROM_SECONDS;
}
