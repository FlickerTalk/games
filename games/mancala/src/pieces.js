import { clamp, ellipse, hash, paint } from "../../../kit/src/canvas/pen.js";
import { ART } from "./theme.js";

const PLACES = [
  [0, 0],
  [-0.42, -0.28],
  [0.4, -0.3],
  [-0.43, 0.3],
  [0.4, 0.3],
  [0, -0.52],
  [0, 0.52],
  [-0.22, 0.04],
  [0.22, 0.04],
];

export const SHOWN = PLACES.length;

export function drawSeed(ctx, theme, x, y, size, index = 0, turn = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn + (hash(index + 4) - 0.5) * 0.35);
  ctx.beginPath();
  ctx.moveTo(-size * 0.46, -size * 0.1);
  ctx.bezierCurveTo(-size * 0.44, -size * 0.5, size * 0.25, -size * 0.58, size * 0.47, -size * 0.18);
  ctx.bezierCurveTo(size * 0.62, size * 0.2, size * 0.18, size * 0.52, -size * 0.22, size * 0.42);
  ctx.bezierCurveTo(-size * 0.5, size * 0.35, -size * 0.58, size * 0.1, -size * 0.46, -size * 0.1);
  paint(ctx, theme.seeds.body, theme.ink, Math.max(1.3, size * 0.085));
  ellipse(ctx, -size * 0.12, -size * 0.18, size * 0.16, size * 0.08, theme.seeds.light);
  ctx.restore();
}

export const seedSize = (rx, ry, count) => clamp(Math.min(rx, ry) * (Math.min(count, SHOWN) > 6 ? 0.48 : 0.62), 5, 28);

export function drawSeeds(ctx, theme, x, y, rx, ry, count) {
  const shown = Math.min(count, SHOWN);
  const size = seedSize(rx, ry, count);
  for (let index = 0; index < shown; index += 1) {
    const [px, py] = PLACES[index];
    drawSeed(ctx, theme, x + px * rx * 1.25, y + py * ry * 1.25, size, index);
  }
}

const MARKS = {
  ring: ['<circle r="20"', '<circle r="8.4"'],
  diamond: ['<polygon points="0,-22 20,0 0,22 -20,0"', '<polygon points="0,-9 8,0 0,9 -8,0"'],
};

export function sideMark(side) {
  const { body, light, mark } = ART.pieces[side];
  const [whole, centre] = MARKS[mark];
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${whole} fill="${body}" stroke="${ART.ink}" stroke-width="2.6"/>${centre} fill="${light}" stroke="${ART.ink}" stroke-width="1.6"/></svg>`;
}
