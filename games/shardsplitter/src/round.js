import { usefulFor } from "./numbers.js";

export function startRound({ hands, golems }) {
  return { hands, golems, at: 0, value: golems[0].number, count: 1, last: null, clinks: hands.map(() => 0), over: false };
}

export const golemOf = (round) => round.golems[round.at] ?? null;

export const handOf = (round, side) => round.hands[side] ?? [];

export const clinksOf = (round) => round.clinks.reduce((sum, clinks) => sum + clinks, 0);

export function usefulNow(round, side) {
  return round.over ? [] : usefulFor(round.value, handOf(round, side), golemOf(round).cap);
}

export function turnOf(round) {
  if (round.over) return null;
  const able = round.hands.map((_, side) => usefulNow(round, side).length > 0);
  if (round.hands.length === 1) return 0;
  if (able[0] !== able[1]) return able[0] ? 0 : 1;
  return round.last === null ? round.at % 2 : 1 - round.last;
}

function advance(round) {
  const at = round.at + 1;
  if (at >= round.golems.length) return { ...round, at, value: 1, count: 0, last: null, over: true };
  return { ...round, at, value: round.golems[at].number, count: 1, last: null };
}

export function strike(round, side, divisor) {
  if (round.over || side !== turnOf(round) || !handOf(round, side).includes(divisor)) return { round, event: null };
  const golem = round.at;
  const { cap } = golemOf(round);
  if (divisor === cap || round.value % divisor !== 0) {
    const clinks = round.clinks.map((count, at) => count + (at === side ? 1 : 0));
    return { round: { ...round, clinks }, event: { kind: "clink", side, divisor, golem, capped: divisor === cap } };
  }
  const from = { value: round.value, count: round.count };
  const to = { value: round.value / divisor, count: round.count * divisor };
  const split = { ...round, ...to, last: side };
  const done = round.hands.every((_, one) => usefulNow(split, one).length === 0);
  const next = done ? advance(split) : split;
  return { round: next, event: { kind: "split", side, divisor, golem, from, to, done, over: next.over } };
}

export function replayRound(made, hits) {
  let round = startRound(made);
  for (const [side, divisor] of hits) {
    const done = strike(round, side, divisor);
    if (!done.event) return null;
    round = done.round;
  }
  return round;
}
