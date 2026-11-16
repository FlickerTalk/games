import { circle, clamp, paint, roundedRect, starPath } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

function drawBlock(ctx, theme, size, face) {
  const { board, ink } = theme;
  const [half, line, round] = [size / 2, Math.max(1.5, size * 0.035), size * 0.17];
  roundedRect(ctx, -half, -half + size * 0.07, size, size * 0.93, round);
  paint(ctx, board.edge, ink, line);
  roundedRect(ctx, -half, -half, size, size * 0.9, round);
  paint(ctx, face ?? board.face, ink, line);
  if (!face) {
    roundedRect(ctx, -size * 0.4, -size * 0.39, size * 0.8, size * 0.68, size * 0.12);
    paint(ctx, board.inner);
    ctx.save();
    ctx.globalAlpha *= 0.5;
    roundedRect(ctx, -size * 0.35, -size * 0.34, size * 0.7, size * 0.58, size * 0.1);
    paint(ctx, board.face);
    ctx.restore();
  }
  ctx.strokeStyle = board.edge;
  ctx.lineWidth = Math.max(1, size * 0.022);
  ctx.lineCap = "round";
  for (const offset of [-0.2, 0.22]) {
    ctx.beginPath();
    ctx.arc(offset * size, -size * 0.225, size * 0.23, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
}

function drawGlyph(ctx, theme, text, x, y, size, weight) {
  ctx.fillStyle = theme.ink;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function drawBadges(ctx, theme, size, { order, can, last }) {
  if (can) for (const dx of [-0.1, 0, 0.1]) circle(ctx, dx * size, size * 0.34, Math.max(1.4, size * 0.025), theme.ink);
  if (order) {
    const radius = Math.max(6.5, size * 0.14);
    circle(ctx, size * 0.32, -size * 0.32, radius, theme.marks.white, theme.ink, Math.max(1, size * 0.025));
    drawGlyph(ctx, theme, String(order), size * 0.32, -size * 0.31, Math.max(9, size * 0.18), 800);
  }
  if (last) {
    const outer = Math.max(5, size * 0.11);
    starPath(ctx, -size * 0.33, -size * 0.32, outer);
    paint(ctx, theme.marks.star, theme.ink, 1);
  }
}

export function drawTile(ctx, theme, x, y, size, letter, { side = null, order = 0, can = false, last = false, hop = 0, shake = 0, alpha = 1 } = {}) {
  const lift = Math.sin(clamp(hop) * Math.PI) * size * 0.2;
  const wobble = Math.sin(clamp(shake) * Math.PI * 6) * (1 - clamp(shake)) * size * 0.09;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.translate(x + wobble, y - lift);
  drawBlock(ctx, theme, size, side === null ? null : theme.sides[side].body);
  if (letter) drawGlyph(ctx, theme, letter.toUpperCase(), 0, size * 0.02, size * 0.61, 900);
  drawBadges(ctx, theme, size, { order, can, last });
  ctx.restore();
}

const STAR = Array.from({ length: 10 }, (_, point) => {
  const [radius, angle] = [point % 2 ? 5.3 : 11, -Math.PI / 2 + (point * Math.PI) / 5];
  return `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;
}).join(" ");

export function sideMark(side) {
  const { body, mark } = ART.sides[side];
  const [ink, white] = [ART.ink, ART.marks.white];
  const inside =
    mark === "star"
      ? `<circle r="21" fill="${body}" stroke="${ink}" stroke-width="2.6"/><polygon points="${STAR}" fill="${white}" stroke="${ink}" stroke-width="1.4"/>`
      : `<polygon points="0,-22 22,0 0,22 -22,0" fill="${body}" stroke="${ink}" stroke-width="2.6"/>${[-6, 0, 6].map((x) => `<circle cx="${x}" r="2.1" fill="${white}"/>`).join("")}`;
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${inside}</svg>`;
}
