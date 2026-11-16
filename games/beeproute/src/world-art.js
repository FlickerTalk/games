import { ellipse, hash, line, paint, starPath } from "../../../kit/src/canvas/pen.js";

export const WORLDS = Object.freeze(["workshop", "garden", "space"]);

function workshop(ctx, { x, y, w, h }, look) {
  for (let across = x; across < x + w; across += 80) line(ctx, [[across, y], [across, y + h]], look.deco, 1.5);
  for (let down = y; down < y + h; down += 80) line(ctx, [[x, down], [x + w, down]], look.deco, 1.5);
}

function garden(ctx, { x, y, w, h }, look) {
  for (let flower = 0; flower < 22; flower += 1) {
    const px = x + 6 + hash(flower * 3.1) * (w - 12);
    const py = y + 4 + hash(flower * 7.3) * (h - 16);
    ellipse(ctx, px, py, 5, 3, flower % 2 ? look.leaf : look.spark);
    line(ctx, [[px, py + 3], [px - 2, py + 10]], look.deco, 2);
  }
}

function space(ctx, { x, y, w, h }, look, time) {
  for (let star = 0; star < 34; star += 1) {
    const px = x + 4 + hash(star * 4.7) * (w - 8);
    const py = y + 4 + hash(star * 8.9) * (h - 8);
    const glow = 1.5 + Math.sin(time * 1.5 + star) * 0.5;
    starPath(ctx, px, py, glow + 1, glow * 0.45);
    paint(ctx, star % 3 ? look.deco : look.spark, null, 0);
  }
}

const DRAW = { workshop, garden, space };

export function drawWorld(ctx, world, area, theme, time = 0) {
  const look = theme.art.worlds[world] ?? theme.art.worlds.workshop;
  ctx.save();
  ctx.fillStyle = look.background;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  (DRAW[world] ?? workshop)(ctx, area, look, time);
  ctx.restore();
}
