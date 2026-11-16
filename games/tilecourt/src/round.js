import { emptyCourt, fitsAnywhere, place, rescue } from "./court.js";
import { pieceOf } from "./pieces.js";
import { pointsFor } from "./scoring.js";
import { STANDARD_MIX, dealTrays } from "./trays.js";
import { variantOf } from "./variants.js";

export function startRound({ variant = "main", seed, mix = STANDARD_MIX }) {
  const rules = variantOf(variant);
  const trays = dealTrays(seed, { count: rules.trays, size: rules.tray, pool: rules.pool, mix });
  return { variant: rules.id, seed, mix, trays, tray: 0, slots: [...trays[0]], court: emptyCourt(rules.size), score: 0, lines: 0, placements: [], over: null };
}

function unstick(court, slots, rules) {
  const pieces = slots.filter(Boolean).map(pieceOf);
  const rescued = [];
  let now = court;
  while (!fitsAnywhere(now, pieces)) {
    const freed = rules.rescue ? rescue(now) : null;
    if (!freed) return { court: now, rescued, stuck: true };
    now = freed.court;
    rescued.push(freed.line);
  }
  return { court: now, rescued, stuck: false };
}

function nextTray(round, slots) {
  if (slots.some(Boolean)) return { slots, tray: round.tray, dealt: false, over: null };
  if (round.tray + 1 < round.trays.length) return { slots: [...round.trays[round.tray + 1]], tray: round.tray + 1, dealt: true, over: null };
  return { slots, tray: round.tray, dealt: false, over: "done" };
}

export function placeInRound(round, slot, at) {
  if (round.over) return { error: "over" };
  const id = Number.isInteger(slot) ? round.slots[slot] : null;
  if (!id) return { error: "empty" };
  const rules = variantOf(round.variant);
  const laid = place(round.court, pieceOf(id), at, { beds: rules.beds });
  if (!laid) return { error: "taken" };
  const points = pointsFor({ tiles: laid.tiles.length, lines: laid.lines.length, emptied: laid.emptied });
  const dealt = nextTray(round, round.slots.map((one, index) => (index === slot ? null : one)));
  const unstuck = dealt.over ? { court: laid.court, rescued: [], stuck: false } : unstick(laid.court, dealt.slots, rules);
  const over = dealt.over ?? (unstuck.stuck ? "full" : null);
  const next = {
    ...round,
    court: unstuck.court,
    slots: dealt.slots,
    tray: dealt.tray,
    score: round.score + points,
    lines: round.lines + laid.lines.length,
    placements: [...round.placements, [slot, at]],
    over,
  };
  const events = { slot, at, piece: id, tiles: laid.tiles, lines: laid.lines, points, emptied: laid.emptied, tray: dealt.dealt, rescued: unstuck.rescued, over };
  return { round: next, events };
}

export function roundResult(round) {
  return { score: round.score, lines: round.lines, done: round.over === "done", trays: round.over === "done" ? round.trays.length : round.tray };
}

export function replayRound({ variant = "main", seed, placements, mix = STANDARD_MIX }) {
  let round = startRound({ variant, seed, mix });
  for (const placement of placements) {
    const [slot, at] = Array.isArray(placement) ? placement : [];
    const played = placeInRound(round, slot, at);
    if (played.error) return null;
    round = played.round;
  }
  return round;
}
