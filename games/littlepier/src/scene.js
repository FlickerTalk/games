import { circle, clamp, ellipse, hash, line, mix, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

export function sunAt(sky, share) {
  const r = clamp(sky.h * 0.16, 10, 30);
  return { x: sky.x + sky.w / 2, y: mix(sky.y + r + 6, sky.y + sky.h - r * 0.3, clamp(share)), r };
}

function clipTo(ctx, area) {
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
}

function cloud(ctx, sky, colours, time, night) {
  const scale = Math.min(1, sky.h / 110);
  const x = sky.x + ((time * 3) % (sky.w + 150)) - 80;
  const y = sky.y + sky.h * 0.3;
  ctx.globalAlpha = night ? 0.15 : 0.65;
  ellipse(ctx, x, y, 47 * scale, 14 * scale, colours.cloud);
  circle(ctx, x - 17 * scale, sky.y + sky.h * 0.23, 17 * scale, colours.cloud);
  circle(ctx, x + 12 * scale, sky.y + sky.h * 0.2, 22 * scale, colours.cloud);
  ctx.globalAlpha = 1;
}

export function drawSky(ctx, sky, day, theme, { time = 0, share = 0, under = sky } = {}) {
  const colours = theme.art.days[day] ?? theme.art.days.morning;
  const sun = sunAt(under, share);
  ctx.save();
  clipTo(ctx, sky);
  ctx.fillStyle = colours.sky;
  ctx.fillRect(sky.x, sky.y, sky.w, sky.h);
  if (day === "night") {
    for (let star = 0; star < 12; star += 1) circle(ctx, under.x + hash(star + 2) * under.w, under.y + 4 + hash(star + 22) * (under.h - 8), 1.5 + hash(star) * 1.5, colours.sun);
    circle(ctx, sun.x, sun.y, sun.r, colours.sun);
    circle(ctx, sun.x + sun.r * 0.42, sun.y - sun.r * 0.26, sun.r * 0.9, colours.sky);
  } else {
    circle(ctx, sun.x, sun.y, sun.r, colours.sun);
  }
  cloud(ctx, under, colours, time, day === "night");
  ctx.restore();
}

function band(ctx, water, at, time, colour) {
  const y = water.y + water.h * (0.09 + at * 0.17);
  const offset = Math.sin(time * 0.35 + at) * water.w * 0.05;
  ctx.beginPath();
  ctx.moveTo(water.x - 30 + offset, y);
  for (let x = -30; x <= water.w + 60; x += 70) ctx.quadraticCurveTo(water.x + x + 35 + offset, y - 7, water.x + x + 70 + offset, y);
  ctx.lineTo(water.x + water.w, y + 10);
  ctx.lineTo(water.x, y + 10);
  ctx.closePath();
  paint(ctx, colour);
}

export function drawWater(ctx, water, day, theme, time = 0) {
  const colours = theme.art.days[day] ?? theme.art.days.morning;
  ctx.save();
  ctx.fillStyle = colours.deep;
  ctx.fillRect(water.x, water.y, water.w, water.h);
  ctx.fillStyle = colours.water;
  ctx.fillRect(water.x, water.y, water.w, water.h * 0.58);
  ctx.save();
  clipTo(ctx, water);
  for (let at = 0; at < 5; at += 1) band(ctx, water, at, time, colours.band);
  for (let bubble = 0; bubble < Math.floor(water.w / 90); bubble += 1) {
    const x = water.x + hash(bubble + 8) * water.w;
    const y = water.y + ((((hash(bubble + 18) * water.h - time * (4 + (bubble % 3))) % water.h) + water.h) % water.h);
    circle(ctx, x, y, 2 + hash(bubble) * 3, null, theme.art.bubble, 1.5);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(water.x, water.y);
  for (let x = 0; x <= water.w; x += 30) ctx.quadraticCurveTo(water.x + x + 15, water.y - 5 - Math.sin(time + x) * 2, water.x + Math.min(water.w, x + 30), water.y);
  paint(ctx, null, colours.foam, 3);
  ctx.restore();
}

export function drawFloor(ctx, floor, day, theme, time = 0) {
  const colours = theme.art.days[day] ?? theme.art.days.morning;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(floor.x, floor.y + 15);
  for (let x = 0; x < floor.w; x += 60) ctx.quadraticCurveTo(floor.x + x + 30, floor.y - 5, floor.x + Math.min(floor.w, x + 60), floor.y + 15);
  ctx.lineTo(floor.x + floor.w, floor.y + floor.h);
  ctx.lineTo(floor.x, floor.y + floor.h);
  ctx.closePath();
  paint(ctx, colours.sand);
  for (let weed = 0; weed < Math.floor(floor.w / 100); weed += 1) {
    const x = floor.x + 35 + weed * 103;
    const sway = Math.sin(time * 0.7 + weed) * 4;
    line(ctx, [[x, floor.y + 22], [x + sway, floor.y - 5], [x + 6 + sway, floor.y - 20]], colours.leaf, 5);
    ellipse(ctx, x + 30, floor.y + 24, 10, 5, colours.sandDark);
  }
  ctx.restore();
}

export function drawPier(ctx, pier, theme) {
  const { pier: wood, ink } = theme.art;
  const post = pier.deck * 0.55;
  ctx.save();
  for (let x = pier.x + 20; x + post <= pier.x + pier.w; x += 115) {
    roundedRect(ctx, x, pier.y, post, pier.posts, 5);
    paint(ctx, wood.woodDark, ink, 3);
  }
  roundedRect(ctx, pier.x, pier.y, pier.w, pier.deck, 7);
  paint(ctx, wood.wood, ink, 3);
  for (let x = pier.x + 12; x < pier.x + pier.w - 12; x += 58) {
    line(ctx, [[x, pier.y + 3], [x, pier.y + pier.deck * 0.85]], wood.woodDark, 2);
    circle(ctx, x + 8, pier.y + pier.deck * 0.3, 2, ink);
  }
  line(ctx, [[pier.x + 5, pier.y + pier.deck * 0.38], [pier.x + pier.w - 5, pier.y + pier.deck * 0.38]], wood.woodLight, 3);
  ctx.restore();
}

export function drawBoat(ctx, x, y, width, theme, time = 0) {
  const { boat, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 1.4) * 3);
  ctx.beginPath();
  ctx.moveTo(-width / 2, -10);
  ctx.quadraticCurveTo(-width * 0.4, width * 0.25, 0, width * 0.27);
  ctx.quadraticCurveTo(width * 0.4, width * 0.25, width / 2, -10);
  ctx.closePath();
  paint(ctx, boat.hull, ink, 3);
  roundedRect(ctx, -width * 0.53, -17, width * 1.06, 14, 7);
  paint(ctx, boat.rim, ink, 3);
  line(ctx, [[-width * 0.3, width * 0.09], [width * 0.3, width * 0.09]], boat.stripe, 3);
  ctx.restore();
}
