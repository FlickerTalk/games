import { TAU, circle, clamp, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

const NOMINAL = 169;

export function drawGoal(ctx, goal, theme, { bulge = 0, at = { x: 0.5, y: 0.5 } } = {}) {
  const { x, y, w, h } = goal;
  const { art } = theme;
  const scale = clamp(h / NOMINAL, 0.55, 1.4);
  const pull = clamp(bulge) * h * 0.16;
  const bx = x + w * clamp(at.x, 0.1, 0.9);
  const by = y + h * clamp(1 - at.y, 0.1, 0.9);
  ctx.save();
  roundedRect(ctx, x + 5, y + 5, w - 10, h - 5, 6);
  paint(ctx, art.goal.back, art.goal.netShade, 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 7, y + 7, w - 14, h - 8);
  ctx.clip();
  ctx.strokeStyle = art.goal.net;
  ctx.lineWidth = 1.5;
  const columns = Math.max(6, Math.round(w / 30));
  const rows = Math.max(4, Math.round(h / 25));
  for (let column = 1; column < columns; column += 1) {
    const px = x + (column * w) / columns;
    ctx.beginPath();
    ctx.moveTo(px, y + 5);
    ctx.quadraticCurveTo(px + (bx - px) * 0.1, by + pull * Math.max(0, 1 - Math.abs(px - bx) / (w * 0.32)), px, y + h);
    ctx.stroke();
  }
  for (let row = 1; row < rows; row += 1) {
    const py = y + (row * h) / rows;
    ctx.beginPath();
    ctx.moveTo(x + 5, py);
    ctx.quadraticCurveTo(bx, py + pull * Math.max(0, 1 - Math.abs(py - by) / (h * 0.5)), x + w - 5, py);
    ctx.stroke();
  }
  ctx.restore();
  const frame = [[x, y + h], [x, y], [x + w, y], [x + w, y + h]];
  if (art.rim) line(ctx, frame, art.rim, 13 * scale + 3);
  line(ctx, frame, art.ink, 13 * scale);
  line(ctx, frame, art.goal.post, 8 * scale);
  line(ctx, [[x - 5, y + h + 3], [x + 15, y + h + 3]], art.ink, 6 * scale);
  line(ctx, [[x + w - 15, y + h + 3], [x + w + 5, y + h + 3]], art.ink, 6 * scale);
  ctx.restore();
}

function bells(ctx, { art, stroke }) {
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 15, 0);
    ctx.beginPath();
    ctx.moveTo(-10, 12);
    ctx.quadraticCurveTo(-6, -17, 0, -18);
    ctx.quadraticCurveTo(6, -17, 10, 12);
    ctx.closePath();
    paint(ctx, art.target.bell, art.ink, stroke.base);
    circle(ctx, 0, 14, 4, art.target.clapper, art.ink, stroke.base);
    ctx.restore();
  }
}

function tyre(ctx, { art, stroke }) {
  circle(ctx, 0, 0, 23, art.target.tyre, art.ink, stroke.base);
  circle(ctx, 0, 0, 12, art.target.hub, art.ink, stroke.base);
  for (let stud = 0; stud < 6; stud += 1) circle(ctx, Math.cos((stud * TAU) / 6) * 18, Math.sin((stud * TAU) / 6) * 18, 2, art.target.stud);
}

export function drawBonusTarget(ctx, x, y, size, kind, theme, { time = 0, hit = 0, cord = 22 } = {}) {
  const scale = size / 52;
  const hang = cord / scale + 20;
  ctx.save();
  ctx.translate(x, y - cord - 20 * scale);
  ctx.rotate(Math.sin(time * 2.5) * 0.07 + hit * Math.sin(time * 16) * 0.12);
  ctx.scale(scale, scale);
  line(ctx, [[0, 0], [0, hang - 20]], theme.art.target.cord, 3);
  ctx.translate(0, hang);
  if (kind === "bells") bells(ctx, theme);
  else tyre(ctx, theme);
  ctx.restore();
}
