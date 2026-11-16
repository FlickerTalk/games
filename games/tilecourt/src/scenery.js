import { circle, ellipse, hash, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

export const SCENERIES = Object.freeze(["patio", "rooftop", "greenhouse", "seaside", "night"]);

const FEWEST = 40;

function tree(ctx, x, y, size, look, width) {
  roundedRect(ctx, x - size * 0.2, y + size * 0.18, size * 0.4, size * 0.32, size * 0.06);
  paint(ctx, look.pot, look.ink, width);
  ellipse(ctx, x, y, size * 0.36, size * 0.36, look.leaf, look.ink, width);
  ellipse(ctx, x - size * 0.16, y - size * 0.08, size * 0.18, size * 0.2, look.leafLight);
  for (const [px, py] of [[-0.17, 0.03], [0.12, -0.15], [0.16, 0.13]]) circle(ctx, x + size * px, y + size * py, size * 0.055, look.fruit, look.ink, 1);
}

function fountain(ctx, x, y, size, look, width) {
  ellipse(ctx, x, y + size * 0.18, size * 0.45, size * 0.19, look.stone, look.ink, width);
  ellipse(ctx, x, y + size * 0.13, size * 0.34, size * 0.11, look.water);
  roundedRect(ctx, x - size * 0.08, y - size * 0.2, size * 0.16, size * 0.36, size * 0.05);
  paint(ctx, look.stoneDark, look.ink, width);
  ellipse(ctx, x, y - size * 0.22, size * 0.19, size * 0.08, look.stone, look.ink, width);
  line(ctx, [[x, y - size * 0.26], [x - size * 0.12, y - size * 0.4], [x - size * 0.2, y - size * 0.15]], look.waterLight, width);
  line(ctx, [[x, y - size * 0.26], [x + size * 0.12, y - size * 0.4], [x + size * 0.2, y - size * 0.15]], look.waterLight, width);
}

function patio(ctx, { x, y, w, h }, look, k, width) {
  ctx.fillStyle = look.wall;
  ctx.fillRect(x, y, w, h);
  for (let step = 0; step < w; step += 28) line(ctx, [[x + step, y + h * 0.9], [x + step + 14, y + h]], look.pot, width);
  fountain(ctx, x + w / 2, y + h * 0.49, 70 * k, look, width);
  tree(ctx, x + 32 * k, y + h * 0.45, 55 * k, look, width);
  tree(ctx, x + w - 32 * k, y + h * 0.45, 55 * k, look, width);
}

function rooftop(ctx, { x, y, w, h }, look, k, width) {
  ctx.fillStyle = look.sky;
  ctx.fillRect(x, y, w, h);
  for (let block = 0; block < 5; block += 1) {
    ctx.fillStyle = look.block;
    ctx.fillRect(x + 20 * k + (block * (w - 40 * k)) / 5, y + h * (0.55 - (block % 2) * 0.08), 28 * k, h * (0.2 + (block % 2) * 0.08));
  }
  ctx.fillStyle = look.roof;
  ctx.fillRect(x, y + h * 0.74, w, h * 0.26);
  ctx.beginPath();
  ctx.moveTo(x + 12, y + h * 0.16);
  ctx.quadraticCurveTo(x + w / 2, y + h * 0.5, x + w - 12, y + h * 0.16);
  paint(ctx, null, look.ink, width);
  for (let bulb = 0; bulb < 8; bulb += 1) {
    const px = x + 12 + ((bulb + 0.5) * (w - 24)) / 8;
    const py = y + h * 0.16 + Math.sin(((bulb + 0.5) / 8) * Math.PI) * h * 0.17 + 5 * k;
    ellipse(ctx, px, py + 4 * k, 4 * k, 6 * k, bulb % 2 ? look.bulb : look.bulbLight, look.ink, width * 0.75);
  }
}

function plant(ctx, x, y, size, look, width) {
  roundedRect(ctx, x - size * 0.18, y + size * 0.16, size * 0.36, size * 0.32, size * 0.05);
  paint(ctx, look.pot, look.ink, width);
  for (let leaf = 0; leaf < 5; leaf += 1) {
    ctx.save();
    ctx.translate(x, y + size * 0.15);
    ctx.rotate(-Math.PI * 0.4 + leaf * Math.PI * 0.2);
    ellipse(ctx, 0, -size * 0.25, size * 0.1, size * 0.26, leaf % 2 ? look.leafLight : look.leaf, look.ink, width * 0.75);
    ctx.restore();
  }
}

function greenhouse(ctx, { x, y, w, h }, look, k, width) {
  ctx.fillStyle = look.glass;
  ctx.fillRect(x, y, w, h);
  for (let step = 0; step <= w; step += 52) line(ctx, [[x + step, y], [x + step, y + h]], look.frame, width);
  line(ctx, [[x, y + h * 0.48], [x + w, y + h * 0.48]], look.frame, width);
  plant(ctx, x + 32 * k, y + h * 0.42, 58 * k, look, width);
  plant(ctx, x + w - 32 * k, y + h * 0.42, 58 * k, look, width);
  plant(ctx, x + w * 0.62, y + h * 0.5, 40 * k, look, width);
}

function seaside(ctx, { x, y, w, h }, look, k, width) {
  ctx.fillStyle = look.sea;
  ctx.fillRect(x, y, w, h * 0.66);
  for (let row = 0; row < 2; row += 1) {
    for (let step = 8 + (row % 2) * 18; step + 24 < w; step += 42) {
      const py = y + h * 0.2 + row * 24 * k;
      line(ctx, [[x + step, py], [x + step + 8, py - 4], [x + step + 16, py], [x + step + 24, py - 4]], look.wave, width);
    }
  }
  ctx.fillStyle = look.deck;
  ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
  for (let step = 0; step <= w; step += 44) line(ctx, [[x + step, y + h * 0.66], [x + step, y + h * 0.94]], look.rail, width);
  line(ctx, [[x, y + h * 0.76], [x + w, y + h * 0.76]], look.rail, width * 1.3);
}

function night(ctx, { x, y, w, h }, look, k, _width, time) {
  ctx.fillStyle = look.sky;
  ctx.fillRect(x, y, w, h);
  for (let star = 0; star < 22; star += 1) {
    ctx.globalAlpha = 0.6 + Math.sin(time * 1.4 + star) * 0.2;
    ctx.fillStyle = star % 3 ? look.star : look.starBright;
    const size = star % 4 ? 2 : 3;
    ctx.fillRect(x + hash(star * 3.7) * (w - size), y + hash(star * 9.2) * (h - size), size, size);
  }
  ctx.globalAlpha = 1;
  circle(ctx, x + w - 34 * k, y + h * 0.28, 14 * k, look.moon);
  circle(ctx, x + w - 28 * k, y + h * 0.23, 13 * k, look.sky);
}

const DRAW = { patio, rooftop, greenhouse, seaside, night };

export function drawScenery(ctx, kind, frame, band, theme, time) {
  const look = { ...(theme.art.scenery[kind] ?? theme.art.scenery.patio), ink: theme.art.ink };
  ctx.save();
  ctx.fillStyle = look.ground;
  ctx.fillRect(0, 0, frame.w, frame.h);
  if (band.h >= FEWEST && band.w > 0) {
    ctx.beginPath();
    ctx.rect(band.x, band.y, band.w, band.h);
    ctx.clip();
    (DRAW[kind] ?? patio)(ctx, band, look, Math.min(1.6, band.h / 100), theme.stroke.thin, time);
  }
  ctx.restore();
}
