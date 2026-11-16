export const PLACE_MS = 350;
export const BURST_MS = 750;
export const RIBBON_MS = 650;
export const CHEER_MS = (3 * Math.PI * 1000) / 5;
export const MISS_MS = 750;

const CHEER_PACE = 5;
const SWAY = 0.06;
const SHAKE = 0.05;

const share = (elapsed, duration) => Math.min(1, Math.max(0, elapsed / duration));

export function planMove(before, after, cell) {
  if (!before || !after || !Number.isInteger(cell)) return null;
  const side = after.cells[cell];
  if (before.cells[cell] !== null || side === null || side === undefined) return null;
  if (after.cells.some((one, at) => at !== cell && one !== before.cells[at])) return null;
  return { cell, side };
}

export function placeFrame(elapsed) {
  return { grow: share(elapsed, PLACE_MS), burst: elapsed < BURST_MS ? share(elapsed, BURST_MS) : null, done: elapsed >= BURST_MS };
}

export function winFrame(elapsed) {
  const cheering = elapsed >= 0 && elapsed < CHEER_MS;
  const phase = (elapsed / 1000) * CHEER_PACE;
  return {
    ribbon: share(elapsed, RIBBON_MS),
    cheer: cheering ? Math.abs(Math.sin(phase)) : 0,
    tilt: cheering ? Math.sin(phase) * SWAY : 0,
    done: elapsed >= Math.max(RIBBON_MS, CHEER_MS),
  };
}

export function missFrame(elapsed) {
  const progress = share(elapsed, MISS_MS);
  if (progress >= 1) return { shake: 0, ring: 1, done: true };
  return { shake: Math.sin(progress * Math.PI * 6) * (1 - progress) * SHAKE, ring: progress, done: false };
}
