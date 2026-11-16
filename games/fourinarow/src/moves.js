import { COLUMNS, ROWS, landing, play, turn } from "./rules.js";

export const START_ROW = -1.05;
export const FALL_MS = 480;
export const BOUNCE_MS = 170;
export const BURST_MS = 480;
const BOUNCE_ROWS = 0.5;
const PULSE_RATE = 5;
export const WIN_MS = Math.round(((3 * 2 * Math.PI) / PULSE_RATE) * 1000);

const clamp = (value) => Math.min(1, Math.max(0, value));
const fallShare = (row) => (row - START_ROW) / (ROWS - 1 - START_ROW);

export function planDrop(before, after, column) {
  if (!before || !after || !Number.isInteger(column)) return null;
  const cell = landing(before.cells, column);
  if (cell < 0) return null;
  const side = turn(before);
  const played = play(before, column, side);
  if (!played.state || played.state.cells.some((one, at) => one !== after.cells[at])) return null;
  return { column, cell, row: Math.floor(cell / COLUMNS), side };
}

export const fallMs = (row) => FALL_MS * Math.sqrt(fallShare(row));

export const totalMs = (plan) => fallMs(plan.row) + Math.max(BOUNCE_MS, BURST_MS);

export function dropFrame(plan, elapsed) {
  const fall = fallMs(plan.row);
  const at = Math.max(0, elapsed);
  if (at < fall) return { row: START_ROW + (plan.row - START_ROW) * (at / fall) ** 2, landed: false, resting: false, burst: null, done: false };
  const since = at - fall;
  const resting = since >= BOUNCE_MS;
  const bounce = clamp(since / BOUNCE_MS);
  const lift = Math.sin(bounce * Math.PI) * (1 - bounce) * BOUNCE_ROWS * Math.sqrt(fallShare(plan.row));
  return {
    row: resting ? plan.row : plan.row - lift,
    landed: true,
    resting,
    burst: since < BURST_MS ? since / BURST_MS : null,
    done: at >= totalMs(plan),
  };
}

export function cuesBetween(plan, from, to) {
  const lands = fallMs(plan.row);
  return lands > from && lands <= to ? ["land"] : [];
}

export const winGlow = (ms) => (ms > 0 && ms < WIN_MS ? Math.sin((ms / 1000) * PULSE_RATE) : 0);
