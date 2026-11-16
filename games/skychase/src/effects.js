import { drawHintHand } from "../../../kit/src/canvas/index.js";
import { TAU, clamp, line, paint, polygon, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { rimmed } from "./rim.js";

const WAYS = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

export function drawAimRing(ctx, x, y, radius, progress, theme, time = 0) {
  const p = clamp(progress);
  if (p <= 0) return;
  const { effects, ink } = theme.art;
  const r = radius * (1 - p * 0.52);
  const colour = p >= 1 ? effects.shut : effects.ring;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 2) * 0.05);
  ctx.lineCap = "round";
  for (let at = 0; at < 4; at += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, r, (at * Math.PI) / 2 + 0.14, ((at + 1) * Math.PI) / 2 - 0.14);
    rimmed(ctx, theme, () => paint(ctx, null, ink, 7));
    paint(ctx, null, colour, 4);
  }
  for (let at = 0; at < 4; at += 1) {
    const turn = (at * Math.PI) / 2 + Math.PI / 4;
    const [ax, ay] = [Math.cos(turn) * (r + 10), Math.sin(turn) * (r + 10)];
    polygon(ctx, [[ax, ay], [ax - Math.cos(turn - 0.5) * 8, ay - Math.sin(turn - 0.5) * 8], [ax - Math.cos(turn + 0.5) * 8, ay - Math.sin(turn + 0.5) * 8]], colour, ink, 1);
  }
  ctx.restore();
}

export function drawCork(ctx, from, to, size, progress, theme) {
  const p = clamp(progress);
  if (p >= 1) return;
  const { effects, ink } = theme.art;
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  ctx.save();
  ctx.translate(from[0] + dx * p, from[1] + dy * p);
  ctx.rotate(Math.atan2(dx, -dy));
  line(ctx, [[0, size * 0.3], [0, size * (0.9 + p)]], effects.ring, 5);
  line(ctx, [[0, size * 0.3], [0, size * (0.9 + p)]], effects.trail, 2);
  roundedRect(ctx, -size * 0.23, -size * 0.38, size * 0.46, size * 0.72, size * 0.16);
  rimmed(ctx, theme, () => paint(ctx, effects.cork, ink, 2));
  line(ctx, [[-size * 0.17, -size * 0.12], [size * 0.17, -size * 0.12]], effects.corkLight, 2);
  ctx.restore();
}

export function drawWrapMarker(ctx, x, y, size, way, theme, time = 0) {
  const { effects, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(WAYS[way] ?? 0);
  ctx.globalAlpha = 0.85;
  ctx.setLineDash([6, 6]);
  line(ctx, [[-size * 0.5, 0], [size * 0.1, 0]], effects.marker, 3);
  ctx.setLineDash([]);
  polygon(ctx, [[size * 0.42, 0], [size * 0.1, -size * 0.24], [size * 0.1, size * 0.24]], effects.marker, ink, 2);
  ctx.beginPath();
  ctx.arc(-size * 0.2, 0, size * 0.34 + Math.sin(time * 3) * 2, -1.1, 1.1);
  paint(ctx, null, effects.markerArc, 3);
  ctx.restore();
}

export function drawConfetti(ctx, area, progress, theme) {
  const p = clamp(progress);
  const colours = theme.art.effects.confetti;
  ctx.save();
  for (let at = 0; at < 24; at += 1) {
    const px = area.x + (((at * 47) % 101) / 101) * area.w;
    const py = area.y + (((at * 31) % 97) / 97) * area.h * 0.35 + p * area.h * 0.6;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(p * TAU + at);
    if (at % 3 === 0) starPath(ctx, 0, 0, 6, 3);
    else roundedRect(ctx, -3, -6, 6, 12, 2);
    paint(ctx, colours[at % colours.length]);
    ctx.restore();
  }
  ctx.restore();
}

export function drawSteerHint(ctx, from, to, size, progress, theme) {
  const { ui } = theme;
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const far = Math.hypot(dx, dy) || 1;
  const bend = [from[0] + dx * 0.5 - (dy / far) * far * 0.3, from[1] + dy * 0.5 + (dx / far) * far * 0.3];
  const tip = [to[0] - (dx / far) * size * 0.34, to[1] - (dy / far) * size * 0.34];
  ctx.save();
  ctx.lineCap = "round";
  ctx.setLineDash([2, 9]);
  ctx.beginPath();
  ctx.moveTo(from[0] + (dx / far) * size * 0.5, from[1] + (dy / far) * size * 0.5);
  ctx.quadraticCurveTo(bend[0], bend[1], tip[0], tip[1]);
  paint(ctx, null, ui.paper, 5);
  ctx.setLineDash([]);
  drawHintHand(ctx, to[0], to[1], size, progress, ui);
  ctx.restore();
}
