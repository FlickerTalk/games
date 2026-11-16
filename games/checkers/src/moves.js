import { SIZE, isKing, play, sideOf, squaresOf } from "./rules.js";

export const STEP_MS = 200;
export const HOP_MS = 280;
export const BURST_MS = 420;
export const CROWN_MS = 420;
const DROPPED_GAP_MS = 90;

const isHop = (from, to) => Math.abs(Math.floor(to / SIZE) - Math.floor(from / SIZE)) === 2;
const clamp = (value) => Math.min(1, Math.max(0, value));

export function planMove(before, after, move) {
  const squares = squaresOf(move);
  if (!before || !after || !squares) return null;
  const piece = before.cells[squares[0]];
  if (piece === null || piece === undefined) return null;
  const played = play(before, move, sideOf(piece));
  if (!played.state || played.state.cells.some((one, at) => one !== after.cells[at])) return null;
  const hops = squares.slice(1).map((to, at) => isHop(squares[at], to));
  const captured = [];
  hops.forEach((hop, leg) => {
    if (!hop) return;
    const cell = (squares[leg] + squares[leg + 1]) / 2;
    captured.push({ cell, piece: before.cells[cell], leg });
  });
  const landed = after.cells[squares.at(-1)];
  return { piece, landed, path: squares, hops, captured, crowned: !isKing(piece) && isKing(landed) };
}

function timeline(plan, travel) {
  const legs = plan.hops.map((hop) => (travel ? (hop ? HOP_MS : STEP_MS) : 0));
  const starts = legs.map((_, leg) => legs.slice(0, leg).reduce((sum, ms) => sum + ms, 0));
  const travelMs = legs.reduce((sum, ms) => sum + ms, 0);
  const bursts = plan.captured.map(({ cell, piece, leg }, at) => ({ cell, piece, at: travel ? starts[leg] + legs[leg] / 2 : at * DROPPED_GAP_MS }));
  const crownAt = plan.crowned ? travelMs : null;
  const total = Math.max(travelMs, ...bursts.map((burst) => burst.at + BURST_MS), crownAt === null ? 0 : crownAt + CROWN_MS);
  return { travelMs, bursts, crownAt, total };
}

export function moveFrame(plan, elapsed, { travel = true } = {}) {
  const line = timeline(plan, travel);
  return {
    progress: line.travelMs ? clamp(elapsed / line.travelMs) : 1,
    standing: line.bursts.filter((burst) => elapsed < burst.at).map(({ cell, piece }) => ({ cell, piece })),
    bursts: line.bursts.filter((burst) => elapsed >= burst.at && elapsed < burst.at + BURST_MS).map((burst) => ({ cell: burst.cell, progress: (elapsed - burst.at) / BURST_MS })),
    crown: line.crownAt === null ? null : elapsed < line.crownAt ? 0 : clamp((elapsed - line.crownAt) / CROWN_MS),
    done: elapsed >= line.total,
  };
}

export function cuesBetween(plan, from, to, { travel = true } = {}) {
  const line = timeline(plan, travel);
  const started = (at) => at > from && at <= to;
  const cues = line.bursts.filter((burst) => started(burst.at)).map(() => "capture");
  if (line.crownAt !== null && started(line.crownAt)) cues.push("crown");
  return cues;
}
