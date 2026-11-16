import { TAU, ellipse, hash, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

const CORNER = 14;

function field(ctx, x, y, rx, ry, colour, turn = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, turn, 0, TAU);
  paint(ctx, colour, null, 0);
}

const GROUNDS = {
  morning(ctx, w, h, look, u) {
    field(ctx, w * 0.05, h * 0.75, w * 0.36, h * 0.38, look.near, -0.3);
    field(ctx, w * 0.94, h * 0.25, w * 0.29, h * 0.25, look.far, 0.4);
    field(ctx, w * 0.74, h * 1.02, w * 0.38, h * 0.26, look.deep, -0.2);
    for (let at = 0; at < 7; at += 1) {
      const x = w * (0.06 + hash(at + 3) * 0.25);
      const y = h * (0.65 + hash(at + 8) * 0.28);
      ellipse(ctx, x, y, 9 * u, 13 * u, look.dot);
      ellipse(ctx, x - 3 * u, y - 4 * u, 4 * u, 6 * u, look.dotLight);
    }
  },
  desert(ctx, w, h, look, u) {
    field(ctx, w * 0.02, h * 0.7, w * 0.38, h * 0.48, look.near, 0.25);
    field(ctx, w * 0.96, h * 0.22, w * 0.34, h * 0.3, look.far, -0.3);
    for (let at = 0; at < 5; at += 1) {
      const x = w * (0.04 + at * 0.07);
      const y = h * (0.66 + Math.sin(at) * 0.08);
      field(ctx, x, y, (24 + at * 3) * u, (46 - at * 3) * u, at % 2 ? look.dot : look.far, -0.4);
      line(ctx, [[x - 9 * u, y - 18 * u], [x + 8 * u, y + 18 * u]], look.dotLight, 4 * u);
    }
  },
  snow(ctx, w, h, look, u) {
    field(ctx, w * 0.08, h * 0.83, w * 0.44, h * 0.36, look.near, -0.15);
    field(ctx, w * 0.96, h * 0.15, w * 0.37, h * 0.3, look.far, 0.2);
    for (let at = 0; at < 6; at += 1) {
      const x = w * (0.02 + at * 0.12);
      const y = h * (0.79 + Math.sin(at * 1.4) * 0.08);
      polygon(ctx, [[x - 37 * u, y + 34 * u], [x, y - 52 * u], [x + 39 * u, y + 34 * u]], look.dot);
      polygon(ctx, [[x - 17 * u, y - 13 * u], [x, y - 52 * u], [x + 18 * u, y - 12 * u], [x + 6 * u, y - 18 * u], [x, y - 9 * u], [x - 6 * u, y - 18 * u]], look.dotLight);
    }
  },
  night(ctx, w, h, look, u) {
    field(ctx, w * 0.08, h * 0.85, w * 0.45, h * 0.38, look.near);
    field(ctx, w * 0.98, h * 0.16, w * 0.35, h * 0.29, look.far);
    for (let at = 0; at < 18; at += 1) {
      const left = at < 9;
      const x = w * (left ? 0.02 + hash(at) * 0.28 : 0.76 + hash(at) * 0.2);
      const y = h * (left ? 0.68 + hash(at + 20) * 0.28 : 0.03 + hash(at + 20) * 0.27);
      const size = (15 + hash(at + 9) * 17) * u;
      roundedRect(ctx, x, y, size, size * 0.8, 3 * u);
      paint(ctx, at % 2 ? look.dot : look.dotLight, null, 0);
      ellipse(ctx, x + size * 0.35, y + size * 0.3, 2.5 * u, 2.5 * u, look.light);
      ellipse(ctx, x + size * 0.7, y + size * 0.55, 2.5 * u, 2.5 * u, look.light);
    }
  },
  sea(ctx, w, h, look, u) {
    field(ctx, w * 0.5, h * 0.5, w * 0.6, h * 0.34, look.deep, 0.5);
    for (let at = 0; at < 7; at += 1) {
      const x = w * hash(at + 2);
      const y = h * hash(at + 12);
      field(ctx, x, y, (28 + hash(at) * 35) * u, (18 + hash(at + 5) * 22) * u, look.near, hash(at + 7));
      field(ctx, x - 5 * u, y - 3 * u, 12 * u, 8 * u, look.far);
    }
    for (let at = 0; at < 12; at += 1) {
      const x = w * hash(at + 30);
      const y = h * hash(at + 50);
      line(ctx, [[x - 12 * u, y], [x + 12 * u, y]], look.dotLight, 2 * u);
    }
  },
};

function light(ctx, w, h, place, look, u) {
  if (place === "sea") return;
  const [x, y] = place === "night" ? [w * 0.78, h * 0.16] : [w * 0.82, h * 0.14];
  ellipse(ctx, x, y, 30 * u, 30 * u, look.light);
  if (place === "night") ellipse(ctx, x - 9 * u, y - 8 * u, 25 * u, 25 * u, look.sky);
}

// the ground is drawn for an upright sky; a sky on its side is the same picture turned with it
export function drawSky(ctx, area, place, theme, { side = false } = {}) {
  const look = theme.art.skies[place] ?? theme.art.skies.morning;
  const [w, h] = side ? [area.h, area.w] : [area.w, area.h];
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, Math.min(CORNER, area.w / 8));
  ctx.clip();
  ctx.fillStyle = look.sky;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  if (side) {
    ctx.translate(area.x, area.y + area.h);
    ctx.rotate(-Math.PI / 2);
  } else ctx.translate(area.x, area.y);
  (GROUNDS[place] ?? GROUNDS.morning)(ctx, w, h, look, w / 368);
  light(ctx, w, h, place, look, w / 368);
  ctx.restore();
}
