import { circle, ellipse, line, paint, polygon, roundedRect, starPath, withRim } from "../../../kit/src/canvas/pen.js";
import { PADDLES } from "./levels.js";

const DEEP = { cat: 0.39, dog: 0.39 };

export const paddleDepth = (kind, width) => width * (DEEP[kind] ?? 0.36);

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);

export function drawSmile(ctx, x, y, size, ink) {
  circle(ctx, x - size * 0.25, y - size * 0.16, size * 0.055, ink);
  circle(ctx, x + size * 0.25, y - size * 0.16, size * 0.055, ink);
  ctx.beginPath();
  ctx.arc(x, y + size * 0.02, size * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.lineCap = "round";
  ctx.stroke();
}

export function drawStarShape(ctx, x, y, size, fill, ink, width) {
  starPath(ctx, x, y, size, size * 0.48);
  paint(ctx, fill, ink, width);
}

function log(ctx, w, h, p, ink, s) {
  roundedRect(ctx, -w / 2, -h * 0.32, w, h * 0.64, h * 0.3);
  paint(ctx, p.body, ink, s);
  ellipse(ctx, -w * 0.39, 0, w * 0.075, h * 0.28, p.light, ink, s);
  ellipse(ctx, -w * 0.39, 0, w * 0.034, h * 0.14, null, p.dark, 2);
  line(ctx, [[-w * 0.15, -h * 0.17], [w * 0.2, -h * 0.17]], p.light, h * 0.08);
  ellipse(ctx, w * 0.18, -h * 0.34, w * 0.09, h * 0.12, p.leaf, ink, s);
  ellipse(ctx, w * 0.29, -h * 0.39, w * 0.08, h * 0.1, p.leafLight, ink, s);
  drawSmile(ctx, w * 0.1, h * 0.03, h * 0.6, ink);
}

function cat(ctx, w, h, p, ink, s) {
  line(ctx, [[w * 0.35, h * 0.1], [w * 0.49, -h * 0.02], [w * 0.44, -h * 0.24]], p.dark, h * 0.13);
  polygon(ctx, [[-w * 0.34, -h * 0.25], [-w * 0.25, -h * 0.55], [-w * 0.13, -h * 0.28]], p.body, ink, s);
  polygon(ctx, [[w * 0.12, -h * 0.28], [w * 0.25, -h * 0.55], [w * 0.34, -h * 0.23]], p.body, ink, s);
  roundedRect(ctx, -w * 0.46, -h * 0.33, w * 0.88, h * 0.68, h * 0.3);
  paint(ctx, p.body, ink, s);
  polygon(ctx, [[-w * 0.25, -h * 0.45], [-w * 0.21, -h * 0.31], [-w * 0.15, -h * 0.34]], p.ear);
  polygon(ctx, [[w * 0.25, -h * 0.45], [w * 0.21, -h * 0.31], [w * 0.15, -h * 0.34]], p.ear);
  drawSmile(ctx, 0, h * 0.02, h * 0.68, ink);
  for (const side of [-1, 1]) {
    line(ctx, [[side * w * 0.16, h * 0.08], [side * w * 0.29, h * 0.04]], ink, 2);
    line(ctx, [[side * w * 0.16, h * 0.15], [side * w * 0.28, h * 0.18]], ink, 2);
  }
}

function dog(ctx, w, h, p, ink, s) {
  line(ctx, [[w * 0.38, 0], [w * 0.49, -h * 0.2], [w * 0.46, -h * 0.34]], p.body, h * 0.1);
  roundedRect(ctx, -w * 0.32, -h * 0.28, w * 0.7, h * 0.57, h * 0.26);
  paint(ctx, p.body, ink, s);
  ellipse(ctx, -w * 0.32, -h * 0.05, w * 0.16, h * 0.34, p.body, ink, s);
  ellipse(ctx, -w * 0.34, h * 0.03, w * 0.075, h * 0.26, p.ear, ink, s);
  ellipse(ctx, -w * 0.45, h * 0.02, w * 0.09, h * 0.12, p.nose, ink, s);
  circle(ctx, -w * 0.51, -h * 0.01, h * 0.065, ink);
  circle(ctx, -w * 0.31, -h * 0.16, h * 0.045, ink);
  line(ctx, [[w * 0.03, -h * 0.27], [w * 0.03, h * 0.27]], p.collar, h * 0.12);
  for (const x of [-0.18, 0.22]) {
    roundedRect(ctx, w * x - w * 0.045, h * 0.18, w * 0.09, h * 0.25, h * 0.08);
    paint(ctx, p.body, ink, s);
  }
}

function rocket(ctx, w, h, p, ink, s) {
  polygon(ctx, [[-w * 0.25, -h * 0.18], [-w * 0.43, -h * 0.48], [-w * 0.4, h * 0.02]], p.fin, ink, s);
  polygon(ctx, [[-w * 0.25, h * 0.18], [-w * 0.43, h * 0.48], [-w * 0.4, -h * 0.02]], p.fin, ink, s);
  ctx.beginPath();
  ctx.moveTo(-w * 0.43, -h * 0.27);
  ctx.lineTo(w * 0.2, -h * 0.27);
  ctx.quadraticCurveTo(w * 0.43, -h * 0.22, w * 0.5, 0);
  ctx.quadraticCurveTo(w * 0.43, h * 0.22, w * 0.2, h * 0.27);
  ctx.lineTo(-w * 0.43, h * 0.27);
  ctx.closePath();
  paint(ctx, p.body, ink, s);
  roundedRect(ctx, -w * 0.51, -h * 0.19, w * 0.12, h * 0.38, h * 0.08);
  paint(ctx, p.dark, ink, s);
  circle(ctx, w * 0.13, 0, h * 0.18, p.window, ink, s);
  circle(ctx, w * 0.13, 0, h * 0.09, p.glass);
  line(ctx, [[-w * 0.29, -h * 0.13], [-w * 0.12, -h * 0.13]], p.light, h * 0.07);
}

function caterpillar(ctx, w, h, p, ink, s) {
  for (let at = 0; at < 5; at += 1) {
    const x = -w * 0.36 + at * w * 0.17;
    const y = Math.sin(at * 1.8) * h * 0.08;
    circle(ctx, x, y, h * (at === 4 ? 0.33 : 0.28), at % 2 ? p.light : p.body, ink, s);
  }
  line(ctx, [[w * 0.3, -h * 0.25], [w * 0.28, -h * 0.48]], ink, 2);
  line(ctx, [[w * 0.4, -h * 0.24], [w * 0.45, -h * 0.45]], ink, 2);
  circle(ctx, w * 0.28, -h * 0.49, h * 0.05, p.feeler, ink, s);
  circle(ctx, w * 0.45, -h * 0.46, h * 0.05, p.feeler, ink, s);
  drawSmile(ctx, w * 0.34, h * 0.02, h * 0.52, ink);
}

function cloud(ctx, w, h, p, ink, s) {
  ctx.beginPath();
  ctx.moveTo(-w * 0.42, h * 0.24);
  ctx.bezierCurveTo(-w * 0.58, h * 0.13, -w * 0.5, -h * 0.15, -w * 0.32, -h * 0.16);
  ctx.bezierCurveTo(-w * 0.31, -h * 0.47, w * 0.02, -h * 0.53, w * 0.11, -h * 0.25);
  ctx.bezierCurveTo(w * 0.33, -h * 0.39, w * 0.51, -h * 0.17, w * 0.42, h * 0.03);
  ctx.bezierCurveTo(w * 0.58, h * 0.24, w * 0.35, h * 0.38, w * 0.17, h * 0.3);
  ctx.lineTo(-w * 0.28, h * 0.3);
  ctx.quadraticCurveTo(-w * 0.39, h * 0.34, -w * 0.42, h * 0.24);
  ctx.closePath();
  paint(ctx, p.body, ink, s);
  drawSmile(ctx, 0, h * 0.04, h * 0.58, ink);
  circle(ctx, -w * 0.18, h * 0.08, h * 0.06, p.cheek);
  circle(ctx, w * 0.18, h * 0.08, h * 0.06, p.cheek);
}

const DRAW = { log, cat, dog, rocket, caterpillar, cloud };

function wideEnds(ctx, width, h, theme, time) {
  const { star } = theme.art;
  for (const side of [-1, 1]) {
    line(ctx, [[side * width * 0.47, 0], [side * width * 0.58, 0]], star.body, h * 0.18);
    ctx.save();
    ctx.translate(side * width * 0.58, -h * 0.28);
    ctx.rotate(side * time);
    drawStarShape(ctx, 0, 0, h * 0.13, star.body, theme.art.ink, 2);
    ctx.restore();
  }
}

export function drawPaddle(ctx, kind, x, y, width, theme, { time = 0, squash = 0, wide = false, rotation = 0 } = {}) {
  const look = DRAW[kind] ? kind : PADDLES[0];
  const h = paddleDepth(look, width);
  const idle = Math.sin(time * 3) * 0.018;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1 + squash * 0.13 + idle, 1 - squash * 0.25 - idle);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  rimmed(ctx, theme, () => {
    if (wide) wideEnds(ctx, width, h, theme, time);
    DRAW[look](ctx, width, h, theme.art.paddles[look], theme.art.ink, theme.stroke.base);
  });
  ctx.restore();
}

export function drawWrappedPaddle(ctx, kind, x, y, size, theme, time = 0) {
  const { gift, ink } = theme.art;
  const s = theme.stroke.base;
  ctx.save();
  ctx.translate(x, y + size * 0.06 + Math.sin(time * 2) * 2);
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    roundedRect(ctx, -size * 0.42, -size * 0.34, size * 0.84, size * 0.72, size * 0.1);
    paint(ctx, kind === "cloud" ? gift.paperAlt : gift.paper, ink, s);
    roundedRect(ctx, -size * 0.07, -size * 0.34, size * 0.14, size * 0.72, 2);
    paint(ctx, gift.ribbon, ink, 2);
    roundedRect(ctx, -size * 0.45, -size * 0.4, size * 0.9, size * 0.17, size * 0.05);
    paint(ctx, gift.lid, ink, s);
    ellipse(ctx, -size * 0.11, -size * 0.48, size * 0.15, size * 0.09, gift.ribbon, ink, s);
    ellipse(ctx, size * 0.11, -size * 0.48, size * 0.15, size * 0.09, gift.ribbon, ink, s);
    circle(ctx, 0, -size * 0.42, size * 0.07, gift.knot, ink, s);
    drawStarShape(ctx, 0, size * 0.07, size * 0.1, gift.mark, ink, 2);
  });
  ctx.restore();
}
