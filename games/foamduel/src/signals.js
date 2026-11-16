import { TAU, circle, clamp, ease, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { FAKES } from "./duel.js";

export const SIGNALS = Object.freeze(["bell", ...FAKES]);

const RAYS = 12;

function bell(ctx, size, { signals, ink }) {
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, size * 0.16);
  ctx.quadraticCurveTo(-size * 0.16, -size * 0.02, -size * 0.17, -size * 0.2);
  ctx.quadraticCurveTo(0, -size * 0.48, size * 0.17, -size * 0.2);
  ctx.quadraticCurveTo(size * 0.16, -size * 0.02, size * 0.3, size * 0.16);
  ctx.closePath();
  paint(ctx, signals.bell, ink, size * 0.055);
  roundedRect(ctx, -size * 0.35, size * 0.1, size * 0.7, size * 0.13, size * 0.06);
  paint(ctx, signals.band, ink, size * 0.05);
  circle(ctx, 0, size * 0.28, size * 0.08, signals.clapper, ink, Math.max(1.5, size * 0.035));
  ellipse(ctx, -size * 0.09, -size * 0.2, size * 0.05, size * 0.1, signals.shine);
}

function bird(ctx, size, { signals, ink }, time) {
  const flap = Math.sin(time * 7) * size * 0.1;
  const width = Math.max(1.5, size * 0.04);
  ellipse(ctx, 0, 0, size * 0.28, size * 0.2, signals.bird, ink, width);
  polygon(ctx, [[-size * 0.1, 0], [-size * 0.36, -size * 0.25 - flap], [size * 0.05, -size * 0.1]], signals.wing, ink, width);
  polygon(ctx, [[size * 0.22, -size * 0.03], [size * 0.4, size * 0.04], [size * 0.22, size * 0.1]], signals.beak, ink, width);
  circle(ctx, size * 0.12, -size * 0.08, size * 0.035, ink);
}

function moon(ctx, size, { signals, ink }) {
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.34, -Math.PI * 0.65, Math.PI * 0.65);
  ctx.quadraticCurveTo(-size * 0.05, 0, size * 0.18, -size * 0.29);
  ctx.closePath();
  paint(ctx, signals.moon, ink, size * 0.05);
  circle(ctx, size * 0.2, size * 0.08, size * 0.035, signals.crater);
}

function leaf(ctx, size, { signals, ink }) {
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, size * 0.2);
  ctx.quadraticCurveTo(-size * 0.36, -size * 0.33, size * 0.33, -size * 0.28);
  ctx.quadraticCurveTo(size * 0.28, size * 0.28, -size * 0.3, size * 0.2);
  ctx.closePath();
  paint(ctx, signals.leaf, ink, size * 0.05);
  line(ctx, [[-size * 0.34, size * 0.3], [size * 0.2, -size * 0.17]], ink, Math.max(1.5, size * 0.04));
}

function burst(ctx, size, art, time, progress) {
  const { signals, ink } = art;
  ctx.rotate(Math.sin(time * 12) * 0.08 * (1 - progress));
  for (let at = 0; at < RAYS; at += 1) {
    const turn = (at * TAU) / RAYS;
    line(ctx, [[Math.cos(turn) * size * 0.45, Math.sin(turn) * size * 0.45], [Math.cos(turn) * size * 0.57, Math.sin(turn) * size * 0.57]], signals.rays[at % 2], size * 0.07);
  }
  circle(ctx, 0, 0, size * 0.43, signals.plate, ink, size * 0.045);
  bell(ctx, size, art);
}

// progress: 0 when the signal starts to 1 once it is fully open
export function drawSignal(ctx, x, y, size, kind, theme, { progress = 1, time = 0 } = {}) {
  const p = clamp(progress);
  if (p <= 0) return;
  const open = ease(Math.min(1, p * 2));
  const { art } = theme;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.translate(x, y - Math.sin(p * Math.PI) * size * 0.16);
  ctx.scale(open, open);
  if (kind === "bell") burst(ctx, size, art, time, p);
  else {
    circle(ctx, 0, 0, size * 0.42, art.signals.plate, art.ink, size * 0.045);
    if (kind === "bird") bird(ctx, size, art, time);
    else if (kind === "moon") moon(ctx, size, art);
    else leaf(ctx, size, art);
  }
  ctx.restore();
}
