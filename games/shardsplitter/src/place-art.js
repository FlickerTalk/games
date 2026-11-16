import { ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

function workshop(ctx, look, ink, { w, h }) {
  ctx.fillStyle = look.sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = look.wall;
  ctx.fillRect(0, h * 0.14, w, h * 0.86);
  const pane = Math.min(w * 0.26, h * 0.3);
  const left = w * 0.08;
  const top = h * 0.2;
  roundedRect(ctx, left, top, pane, pane * 1.15, pane * 0.14);
  paint(ctx, look.light, ink, 4);
  line(ctx, [[left + pane / 2, top + 4], [left + pane / 2, top + pane * 1.15 - 4]], look.mid, 4);
  line(ctx, [[left + 4, top + pane * 0.55], [left + pane - 4, top + pane * 0.55]], look.mid, 4);
  polygon(ctx, [[left + pane * 0.28, top + pane * 0.95], [left + pane * 0.5, top + pane * 0.4], [left + pane * 0.72, top + pane * 0.95]], look.gemA, ink, 3);
  const shelf = h * 0.34;
  line(ctx, [[w * 0.64, shelf], [w * 0.94, shelf]], look.stick, 9);
  polygon(ctx, [[w * 0.69, shelf - 6], [w * 0.74, shelf - pane * 0.5], [w * 0.79, shelf - 6]], look.gemB, ink, 3);
  polygon(ctx, [[w * 0.83, shelf - 6], [w * 0.87, shelf - pane * 0.34], [w * 0.91, shelf - 6]], look.gemC, ink, 3);
}

function ice(ctx, look, ink, { w, h }) {
  ctx.fillStyle = look.sky;
  ctx.fillRect(0, 0, w, h);
  ellipse(ctx, w * 0.5, h * 0.6, w * 0.66, h * 0.62, look.wall);
  const drop = Math.min(h * 0.26, w * 0.4);
  polygon(ctx, [[0, 0], [w * 0.13, drop], [w * 0.21, 0]], look.mid, ink, 3);
  polygon(ctx, [[w * 0.25, 0], [w * 0.34, drop * 0.8], [w * 0.43, 0]], look.light, ink, 3);
  polygon(ctx, [[w * 0.72, 0], [w * 0.8, drop], [w * 0.91, 0]], look.mid, ink, 3);
  polygon(ctx, [[w * 0.03, h * 0.62], [w * 0.09, h * 0.62 - drop * 0.9], [w * 0.15, h * 0.62]], look.gemA, ink, 3);
  polygon(ctx, [[w * 0.86, h * 0.62], [w * 0.92, h * 0.62 - drop], [w * 0.98, h * 0.62]], look.gemB, ink, 3);
}

function candy(ctx, look, ink, { w, h }) {
  ctx.fillStyle = look.sky;
  ctx.fillRect(0, 0, w, h);
  ellipse(ctx, w * 0.52, h * 0.58, w * 0.66, h * 0.66, look.wall);
  const drop = Math.min(24, w * 0.06);
  for (let at = 0; at < 5; at += 1) {
    const x = w * (0.08 + at * 0.21);
    const reach = h * (0.1 + (at % 2) * 0.06);
    line(ctx, [[x, 0], [x, reach]], look.stick, drop * 0.5);
    ellipse(ctx, x, reach + drop * 0.6, drop * 0.7, drop, at % 2 ? look.mid : look.light, ink, 3);
  }
  const pop = Math.min(30, w * 0.08);
  for (const [x, tint] of [[w * 0.1, look.light], [w * 0.92, look.mid]]) {
    line(ctx, [[x, h * 0.5], [x, h * 0.5 + pop * 2.6]], look.stick, 8);
    ellipse(ctx, x, h * 0.5, pop, pop, tint, ink, 4);
    ellipse(ctx, x, h * 0.5, pop * 0.5, pop * 0.5, null, look.gemC, 3);
  }
}

const PLACES = { workshop, ice, candy };

export function drawPlace(ctx, place, area, ground, theme) {
  const { ink, places } = theme.art;
  const name = place in PLACES ? place : "workshop";
  const look = places[name];
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  ctx.translate(area.x, area.y);
  PLACES[name](ctx, look, ink, { w: area.w, h: Math.max(1, ground - area.y) });
  const floor = ground - area.y;
  ctx.fillStyle = look.ground;
  ctx.fillRect(0, floor, area.w, Math.max(0, area.h - floor));
  line(ctx, [[0, floor], [area.w, floor]], ink, 4);
  for (let x = 22; x < area.w; x += 74) ellipse(ctx, x, floor + 22, 10, 5, look.speck);
  ctx.restore();
}
