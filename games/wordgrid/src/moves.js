import { pathOf } from "./rules.js";

export const STEP_MS = 140;
export const HOP_MS = 260;
export const HOP_GAP_MS = 70;
export const BURST_MS = 420;
export const SHAKE_MS = 420;

const clamp = (value) => Math.min(1, Math.max(0, value));

export function planWord(before, after) {
  if (!before?.said || !after?.said || !after.grid) return null;
  for (const side of [0, 1]) {
    const [was, now] = [before.said[side], after.said[side]];
    if (now.length !== was.length + 1 || was.some((word, at) => now[at] !== word)) continue;
    const word = now.at(-1);
    const path = pathOf(after.grid, word);
    return path ? { side, word, path } : null;
  }
  return null;
}

export function wordFrame(plan, elapsed, { travel = true } = {}) {
  const count = plan.path.length;
  const traceMs = travel ? count * STEP_MS : 0;
  const shown = travel ? Math.min(count, Math.floor(elapsed / STEP_MS) + 1) : count;
  const lastHop = traceMs + (count - 1) * HOP_GAP_MS;
  const burstAt = lastHop + HOP_MS / 2;
  const burst = elapsed >= burstAt && elapsed < burstAt + BURST_MS ? { cell: plan.path.at(-1), progress: (elapsed - burstAt) / BURST_MS } : null;
  return {
    traced: plan.path.slice(0, Math.max(0, shown)),
    hops: plan.path.map((cell, at) => ({ cell, progress: clamp((elapsed - traceMs - at * HOP_GAP_MS) / HOP_MS) })),
    burst,
    done: elapsed >= Math.max(lastHop + HOP_MS, burstAt + BURST_MS),
  };
}

export const shakeAt = (elapsed) => (elapsed >= 0 && elapsed < SHAKE_MS ? elapsed / SHAKE_MS : null);
