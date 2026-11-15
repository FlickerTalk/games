import { curveAt, isPlain } from "./curve.js";
import { EASE_AFTER_LOSSES, hasHalfway, roundSeconds } from "./duration.js";
import { giftDue } from "./gifts.js";
import { PASS_AFTER_LOSSES, readRecord } from "./record.js";
import { starsFor } from "./stars.js";

export function nextRound(spec, record) {
  const { level, losses } = readRecord(spec, record);
  const eased = losses >= EASE_AFTER_LOSSES;
  const round = { level, eased, values: curveAt(spec.curve, level, eased) };
  if (!spec.timed) return round;
  const seconds = roundSeconds(level, losses);
  return { ...round, seconds, halfway: hasHalfway(seconds) };
}

function checkResult(spec, result) {
  if (!isPlain(result) || typeof result.won !== "boolean") throw new TypeError("a round's result needs won: true or false");
  if (result.score !== undefined && !Number.isFinite(result.score)) throw new TypeError("a round's score is a number");
  if (spec.stars && result.score === undefined) throw new TypeError("a game with stars gives each round a score");
}

export function awardRound(spec, record, result) {
  checkResult(spec, result);
  const before = readRecord(spec, record);
  const losses = result.won ? 0 : before.losses + 1;
  const passed = losses >= PASS_AFTER_LOSSES;
  const levelUp = result.won || passed;
  const wins = levelUp ? before.wins + 1 : before.wins;
  const gift = levelUp && spec.gifts ? giftDue(spec.gifts, before.received, wins) : null;
  const { score } = result;
  const newBest = score !== undefined && (before.best === null || score > before.best);
  const after = {
    ...before,
    level: levelUp ? before.level + 1 : before.level,
    losses: passed ? 0 : losses,
    wins,
    best: newBest ? score : before.best,
    received: gift ? spec.gifts.looks.filter((look) => look === gift || before.received.includes(look)) : before.received,
    chosen: gift ?? before.chosen,
  };
  const stars = spec.stars ? starsFor(score, spec.stars) : null;
  return { record: after, levelUp, passed, eased: after.losses >= EASE_AFTER_LOSSES, gift, stars, newBest };
}
