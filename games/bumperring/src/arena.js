export const STEPS_PER_SECOND = 120;
export const STEP_MS = 1000 / STEPS_PER_SECOND;
export const DT = 1 / STEPS_PER_SECOND;

export const BODY = 0.2;
export const FIRST_TO = 3;
export const START = Object.freeze([Object.freeze([0, 0.45]), Object.freeze([0, -0.45])]);
export const VARIANTS = Object.freeze(["plain", "shrink", "ice", "trampoline", "bar"]);

export const SHRINK = 0.35;
// how far from the middle a player in the water may drift
export const FLOAT = 1.15;
export const ICE = Object.freeze({ x: 0.22, y: -0.08, rx: 0.47, ry: 0.6 });
export const TRAMPOLINE = 0.35;
// turn: radians a second
export const BAR = Object.freeze({ half: 0.73, thick: 0.05, turn: 0.314159 });

// one degree a step for the arrow, 0.15 of a degree for the bar
const TURNS = { arrow: [0.9998476951563913, 0.01745240643728351], bar: [0.9999965730559848, 0.0026179908874179934] };

export function radiusOf(variant, step, roundSteps) {
  if (variant !== "shrink") return 1;
  return 1 - SHRINK * Math.min(1, Math.max(0, step / roundSteps));
}

export function onIce(x, y) {
  const u = (x - ICE.x) / ICE.rx;
  const v = (y - ICE.y) / ICE.ry;
  return u * u + v * v < 1;
}

export const onTrampoline = (x, y) => x * x + y * y < TRAMPOLINE * TRAMPOLINE;

export function turned({ x, y }, what) {
  const [cos, sin] = TURNS[what];
  const nx = x * cos - y * sin;
  const ny = x * sin + y * cos;
  const length = Math.sqrt(nx * nx + ny * ny);
  return { x: nx / length, y: ny / length };
}

export const barOffset = (bar, x, y) => ({ along: x * bar.x + y * bar.y, across: y * bar.x - x * bar.y });
