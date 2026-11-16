import { circle, polygon } from "../../../kit/src/canvas/pen.js";

function cloud(ctx, x, y, width, colour) {
  const h = width * 0.32;
  ctx.beginPath();
  ctx.moveTo(x - width * 0.43, y + h * 0.32);
  ctx.bezierCurveTo(x - width * 0.58, y - h * 0.1, x - width * 0.35, y - h * 0.55, x - width * 0.18, y - h * 0.38);
  ctx.bezierCurveTo(x - width * 0.12, y - h * 1.15, x + width * 0.28, y - h * 1.1, x + width * 0.3, y - h * 0.4);
  ctx.bezierCurveTo(x + width * 0.55, y - h * 0.42, x + width * 0.57, y + h * 0.35, x + width * 0.35, y + h * 0.43);
  ctx.lineTo(x - width * 0.34, y + h * 0.43);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

function tree(ctx, x, y, size, colours) {
  ctx.fillStyle = colours.trunk;
  ctx.fillRect(x - size * 0.07, y, size * 0.14, size * 0.65);
  circle(ctx, x, y, size * 0.34, colours.tree);
  circle(ctx, x - size * 0.22, y + size * 0.12, size * 0.25, colours.treeLight);
  circle(ctx, x + size * 0.24, y + size * 0.13, size * 0.27, colours.tree);
}

function peak(ctx, x, y, width, height, colour, snow) {
  polygon(ctx, [[x - width / 2, y], [x, y - height], [x + width / 2, y]], colour);
  polygon(ctx, [[x - width * 0.17, y - height * 0.66], [x, y - height], [x + width * 0.2, y - height * 0.6], [x + width * 0.06, y - height * 0.66], [x - width * 0.03, y - height * 0.54]], snow);
}

function meadow(ctx, { x, y, w, h }, ground, colours, time) {
  const sky = ground - y;
  const least = Math.min(w, h);
  circle(ctx, x + w * 0.82, y + sky * 0.3, least * 0.075, colours.sun);
  cloud(ctx, x + w * 0.22 + Math.sin(time * 0.25) * 4, y + sky * 0.36, w * 0.28, colours.cloud);
  cloud(ctx, x + w * 0.72, y + sky * 0.55, w * 0.22, colours.cloudShade);
  const rise = Math.min(h * 0.1, 70);
  ctx.fillStyle = colours.hill;
  ctx.beginPath();
  ctx.moveTo(x, ground - rise * 0.2);
  ctx.quadraticCurveTo(x + w * 0.28, ground - rise * 1.3, x + w * 0.55, ground - rise * 0.1);
  ctx.quadraticCurveTo(x + w * 0.8, ground + rise * 0.6, x + w, ground - rise * 0.5);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.fill();
  ctx.fillStyle = colours.ground;
  ctx.fillRect(x, ground + rise * 0.7, w, y + h - ground - rise * 0.7);
  tree(ctx, x + w * 0.07, ground - rise * 0.5, least * 0.13, colours);
  tree(ctx, x + w * 0.94, ground - rise * 0.1, least * 0.1, colours);
}

function mountain(ctx, { x, y, w, h }, ground, colours) {
  const sky = ground - y;
  peak(ctx, x + w * 0.18, ground, w * 0.7, sky * 0.55, colours.far, colours.snow);
  peak(ctx, x + w * 0.74, ground, w * 0.82, sky * 0.68, colours.near, colours.snow);
  ctx.fillStyle = colours.ground;
  ctx.fillRect(x, ground, w, y + h - ground);
  cloud(ctx, x + w * 0.18, y + sky * 0.3, w * 0.3, colours.cloud);
}

function clouds(ctx, { x, y, w, h }, ground, colours, time) {
  const sky = ground - y;
  circle(ctx, x + w * 0.82, y + sky * 0.3, Math.min(w, h) * 0.08, colours.sun);
  cloud(ctx, x + w * 0.15 + Math.sin(time * 0.25) * 4, y + sky * 0.5, w * 0.28, colours.cloud);
  const rows = Math.max(1, Math.ceil((y + h - ground) / (w * 0.09)));
  for (let row = 0; row < rows; row += 1) {
    for (let at = 0; at < 7; at += 1) cloud(ctx, x + ((at - 0.5 + (row % 2) * 0.5) * w) / 5, ground + w * 0.05 + row * w * 0.09, w * 0.42, (at + row) % 2 ? colours.cloudShade : colours.cloud);
  }
}

const PLACES = { meadow, mountain, clouds };

export function drawScenery(ctx, area, place, theme, time, { ground = area.y + area.h * 0.74 } = {}) {
  if (area.w < 40 || area.h < 30) return;
  const name = PLACES[place] ? place : "meadow";
  const colours = theme.art.places[name];
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  ctx.fillStyle = colours.sky;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  PLACES[name](ctx, area, ground, colours, time);
  ctx.restore();
}
