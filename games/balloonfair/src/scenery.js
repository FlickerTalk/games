import { circle, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

function puffy(ctx, x, y, size, colour) {
  circle(ctx, x - size * 0.25, y, size * 0.25, colour);
  circle(ctx, x, y - size * 0.14, size * 0.34, colour);
  circle(ctx, x + size * 0.3, y, size * 0.24, colour);
  roundedRect(ctx, x - size * 0.47, y, size * 0.94, size * 0.22, size * 0.1);
  paint(ctx, colour);
}

function day(ctx, w, h, look, time) {
  circle(ctx, w * 0.82, h * 0.16, Math.min(w, h) * 0.07, look.sun);
  const scale = Math.min(1, w / 360);
  puffy(ctx, w * 0.18 + Math.sin(time * 0.1) * 8 * scale, h * 0.2, 55 * scale, look.cloud);
  puffy(ctx, w * 0.65 + Math.sin(time * 0.08 + 2) * 8 * scale, h * 0.32, 38 * scale, look.cloud);
  ctx.fillStyle = look.hill;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  ctx.quadraticCurveTo(w * 0.2, h * 0.52, w * 0.45, h * 0.72);
  ctx.quadraticCurveTo(w * 0.72, h * 0.48, w, h * 0.7);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
}

function beach(ctx, w, h, look, time) {
  circle(ctx, w * 0.18, h * 0.18, Math.min(w, h) * 0.065, look.sun);
  const scale = Math.min(1, w / 360);
  puffy(ctx, w * 0.72 + Math.sin(time * 0.1) * 8 * scale, h * 0.18, 46 * scale, look.cloud);
  ctx.fillStyle = look.sea;
  ctx.fillRect(0, h * 0.48, w, h * 0.32);
  ctx.fillStyle = look.sand;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
  for (let at = 0; at < 5; at += 1) line(ctx, [[w * (0.08 + at * 0.2), h * 0.59], [w * (0.16 + at * 0.2), h * 0.59]], look.wave, 3 * scale);
  ctx.fillStyle = look.pier;
  ctx.fillRect(0, h * 0.74, w, h * 0.06);
  for (let at = 0; at < 7; at += 1) ctx.fillRect((at * w) / 6 - 3 * scale, h * 0.72, 7 * scale, h * 0.28);
}

function evening(ctx, w, h, look) {
  circle(ctx, w * 0.78, h * 0.17, Math.min(w, h) * 0.065, look.moon);
  circle(ctx, w * 0.8, h * 0.15, Math.min(w, h) * 0.06, look.sky);
  for (let at = 0; at < 15; at += 1) circle(ctx, (((at * 83) % 97) / 97) * w, (0.08 + ((at * 37) % 31) / 100) * h, at % 3 === 0 ? 2.5 : 1.5, look.star);
  ctx.fillStyle = look.ground;
  ctx.fillRect(0, h * 0.67, w, h * 0.33);
  for (let at = 0; at < 6; at += 1) {
    ctx.fillStyle = at % 2 ? look.booth : look.boothDark;
    ctx.fillRect((at * w) / 5 - 10, h * (0.52 + (at % 2) * 0.08), w * 0.17, h * 0.3);
  }
}

const FAIRS = { day, beach, evening };

export function drawScenery(ctx, area, scenery, theme, time = 0) {
  const look = theme.art.sceneries[scenery] ?? theme.art.sceneries.day;
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  ctx.fillStyle = look.sky;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.translate(area.x, area.y);
  (FAIRS[scenery] ?? day)(ctx, area.w, area.h, look, time);
  ctx.restore();
}

const POST = 12;

export function drawStallBack(ctx, { stage, awning }, scenery, theme) {
  const { stall } = theme.art;
  ctx.save();
  ctx.fillStyle = stall.post;
  ctx.fillRect(stage.x + 5, stage.y + awning * 0.65, POST, stage.h - awning * 0.65);
  ctx.fillRect(stage.x + stage.w - 5 - POST, stage.y + awning * 0.65, POST, stage.h - awning * 0.65);
  ctx.restore();
}

function stripes(ctx, w, awning, stall) {
  const count = Math.max(7, Math.round(w / 104) * 2 + 1);
  const band = awning * 0.7;
  for (let at = 0; at < count; at += 1) {
    const left = (at * w) / count;
    const right = ((at + 1) * w) / count;
    const colour = at % 2 ? stall.stripeAlt : stall.stripe;
    polygon(ctx, [[left, 0], [right, 0], [Math.min(w + 4, right + 4), band], [Math.max(-4, left - 4), band]], colour);
    ellipse(ctx, (left + right) / 2, band, (w / count) * 0.48, Math.min((w / count) * 0.48, awning * 0.42), colour);
  }
}

function lights(ctx, w, awning, { stall, ink }) {
  line(ctx, [[0, awning * 0.92], [w, awning * 0.92]], ink, 2);
  for (let at = 0; at < 9; at += 1) circle(ctx, (w * (at + 0.5)) / 9, awning * 0.97, 5, stall.bulb, ink, 2);
}

export function drawStallFront(ctx, { stage, awning, counter }, scenery, theme) {
  const { stall, ink } = theme.art;
  const w = stage.w;
  ctx.save();
  ctx.translate(stage.x, stage.y);
  roundedRect(ctx, -3, stage.h - counter, w + 6, counter - 2, 12);
  paint(ctx, stall.counter, ink, 4);
  for (let at = 1; at < 6; at += 1) line(ctx, [[(w * at) / 6, stage.h - counter + 8], [(w * at) / 6, stage.h - 12]], stall.plank, 2);
  stripes(ctx, w, awning, stall);
  line(ctx, [[0, 1.5], [w, 1.5]], ink, 3);
  line(ctx, [[0, awning * 0.7], [w, awning * 0.7]], ink, 3);
  if (scenery === "evening") lights(ctx, w, awning, theme.art);
  ctx.restore();
}
