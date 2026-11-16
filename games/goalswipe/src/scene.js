import { circle, ellipse, line, paint, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);

function cloud(ctx, x, y, size, colour) {
  circle(ctx, x - size * 0.25, y, size * 0.24, colour);
  circle(ctx, x, y - size * 0.12, size * 0.32, colour);
  circle(ctx, x + size * 0.3, y, size * 0.22, colour);
  roundedRect(ctx, x - size * 0.48, y, size * 0.96, size * 0.22, size * 0.1);
  paint(ctx, colour, null, 0);
}

function school(ctx, { x, y, w }, horizon, look, top) {
  ctx.fillStyle = look.sky;
  ctx.fillRect(x, y, w, horizon - y);
  const sky = Math.max(0, horizon - 60 - top);
  cloud(ctx, x + w * 0.18, top + sky * 0.35, 54, look.cloud);
  cloud(ctx, x + w * 0.82, top + sky * 0.7, 42, look.cloud);
  ctx.fillStyle = look.track;
  ctx.fillRect(x, horizon - 28, w, 54);
  line(ctx, [[x, horizon - 5], [x + w, horizon - 5]], look.trackLight, 4);
  const unit = Math.max(36, w / 8);
  for (let px = x + 12; px < x + w; px += unit) line(ctx, [[px, horizon - 50], [px, horizon - 8]], look.fence, 3);
  line(ctx, [[x, horizon - 48], [x + w, horizon - 48]], look.fence, 3);
}

function beach(ctx, { x, y, w }, horizon, look, top, time) {
  ctx.fillStyle = look.sky;
  ctx.fillRect(x, y, w, horizon - y);
  circle(ctx, x + w * 0.8, top + Math.max(24, (horizon - 54 - top) * 0.45), 24, look.sun);
  ctx.fillStyle = look.sea;
  ctx.fillRect(x, horizon - 54, w, 68);
  for (let at = 0; at < 5; at += 1) {
    const px = x + ((at + 0.5) * w) / 5;
    const wave = Math.sin(time * 2 + at) * 3;
    line(ctx, [[px - 18, horizon - 27 + wave], [px, horizon - 31 + wave], [px + 18, horizon - 27 + wave]], look.wave, 3);
  }
}

function stadium(ctx, { x, y, w }, horizon, look, top) {
  ctx.fillStyle = look.sky;
  ctx.fillRect(x, y, w, horizon + 20 - y);
  ctx.fillStyle = look.stand;
  ctx.fillRect(x, horizon - 95, w, 110);
  for (let row = 0; row < 3; row += 1) line(ctx, [[x, horizon - 70 + row * 29], [x + w, horizon - 70 + row * 29]], look.standAlt, 9);
  const lamp = Math.min(top + 8, horizon - 130);
  for (const lx of [x + 22, x + w - 22]) {
    line(ctx, [[lx, horizon - 65], [lx, lamp + 12]], look.pole, 5);
    roundedRect(ctx, lx - 20, lamp, 40, 18, 5);
    paint(ctx, look.lamp, null, 0);
    for (let bulb = -1; bulb <= 1; bulb += 1) circle(ctx, lx + bulb * 11, lamp + 9, 3, look.bulb);
  }
}

function turf(ctx, { x, y, w, h }, ground, look) {
  const tall = y + h - ground;
  ctx.fillStyle = look.ground;
  ctx.fillRect(x, ground, w, tall);
  ctx.fillStyle = look.stripe;
  for (let row = 0; row < 4; row += 2) ctx.fillRect(x, ground + 10 + row * tall * 0.25, w, tall * 0.125);
}

function markings(ctx, { x, y, w, h }, at, colour, box) {
  if (!(at < y + h - 6)) return;
  if (!box) {
    line(ctx, [[x, at], [x + w, at]], colour, 4);
    return;
  }
  line(ctx, [[x + w * 0.08, at], [x + w * 0.92, at]], colour, 4);
  line(ctx, [[x + w * 0.18, at], [x + w * 0.32, y + h], [x + w * 0.68, y + h], [x + w * 0.82, at]], colour, 4);
}

export function drawField(ctx, area, field, theme, { time = 0, horizon, top = 0, lineAt = null } = {}) {
  const look = theme.art.fields[field] ?? theme.art.fields.school;
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  if (field === "beach") {
    beach(ctx, area, horizon, look, top, time);
    ctx.fillStyle = look.ground;
    ctx.fillRect(area.x, horizon + 8, area.w, area.y + area.h - horizon - 8);
    ellipse(ctx, area.x + 28, horizon + 54, 18, 6, look.stripe);
  } else {
    if (field === "stadium") stadium(ctx, area, horizon, look, top);
    else school(ctx, area, horizon, look, top);
    turf(ctx, area, horizon + 20, look);
  }
  if (lineAt !== null) markings(ctx, area, lineAt, look.line, field !== "beach");
  ctx.restore();
}

export function drawCrowd(ctx, area, theme, { time = 0, reaction = 0 } = {}) {
  const { art, stroke } = theme;
  const count = Math.max(3, Math.floor(area.w / 36));
  const size = Math.min(12, area.h * 0.2);
  ctx.save();
  for (let at = 0; at < count; at += 1) {
    const px = area.x + ((at + 0.5) * area.w) / count;
    const py = area.y + area.h * 0.55 - reaction * Math.abs(Math.sin(time * 6 + at * 0.7)) * 10 + (at % 2) * 5;
    circle(ctx, px, py, size, art.crowd[at % art.crowd.length], art.ink, stroke.thin);
    circle(ctx, px - size / 3, py - 1, 1.5, art.ink);
    circle(ctx, px + size / 3, py - 1, 1.5, art.ink);
    if (reaction > 0.25) {
      line(ctx, [[px - size * 0.75, py + size + 1], [px - size * 1.25, py + size / 3]], art.ink, stroke.base);
      line(ctx, [[px + size * 0.75, py + size + 1], [px + size * 1.25, py + size / 3]], art.ink, stroke.base);
    }
  }
  ctx.restore();
}
