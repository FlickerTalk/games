import { circle, ease, ellipse, paint, polygon, roundedRect, starPath, withRim } from "../../../kit/src/canvas/pen.js";
import { PAGE_H, PAGE_W, outline, required, zonesOf } from "./geometry.js";
import { paintOf } from "./paints.js";
import { STAMPS, WIDTHS } from "./work.js";

const DOT = 4.5;

export function traceRegion(ctx, { k, v }) {
  ctx.beginPath();
  if (k === "e") ctx.ellipse(v[0], v[1], v[2], v[3], 0, 0, Math.PI * 2);
  else if (k === "r") roundedRect(ctx, ...v);
  else if (k === "p") {
    for (let at = 0; at < v.length; at += 2) (at ? ctx.lineTo : ctx.moveTo).call(ctx, v[at], v[at + 1]);
    ctx.closePath();
  } else {
    for (const [op, ...n] of v) {
      if (op === "M") ctx.moveTo(...n);
      else if (op === "L") ctx.lineTo(...n);
      else if (op === "Q") ctx.quadraticCurveTo(...n);
      else if (op === "C") ctx.bezierCurveTo(...n);
      else ctx.closePath();
    }
  }
}

function areaOf(region) {
  const points = outline(region).flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function bands(ctx, [left, top, right, bottom], colours, size) {
  const height = bottom - top;
  const first = Math.floor((left - height) / size);
  for (let at = first; at * size < right; at += 1) {
    ctx.fillStyle = colours[((at % colours.length) + colours.length) % colours.length];
    ctx.beginPath();
    ctx.moveTo(at * size, top);
    ctx.lineTo(at * size + size, top);
    ctx.lineTo(at * size + size + height, bottom);
    ctx.lineTo(at * size + height, bottom);
    ctx.closePath();
    ctx.fill();
  }
}

function sprinkle(ctx, [left, top, right, bottom], step, mark) {
  const reach = 10;
  for (let row = Math.floor((top - reach) / step); row * step <= bottom + reach; row += 1) {
    const shift = row % 2 ? step / 2 : 0;
    for (let column = Math.floor((left - reach - shift) / step); column * step + shift <= right + reach; column += 1) mark(column * step + shift, row * step, row + column);
  }
}

export function drawPattern(ctx, pattern, colour, area, theme) {
  const { art } = theme;
  const [left, top, right, bottom] = area;
  const tint = art.paints[colour] ?? art.paints[0];
  ctx.fillStyle = art.paper;
  ctx.fillRect(left, top, right - left, bottom - top);
  if (pattern === "stripes") bands(ctx, area, [tint, art.paper], 22);
  else if (pattern === "rainbow") bands(ctx, area, art.rainbow, 18);
  else if (pattern === "dots") sprinkle(ctx, area, 34, (x, y) => circle(ctx, x, y, 6, tint));
  else {
    const glitter = pattern === "glitter";
    sprinkle(ctx, area, glitter ? 30 : 34, (x, y, at) => {
      starPath(ctx, x, y, glitter ? 7 : 8);
      paint(ctx, glitter ? art.glitter[((at % 3) + 3) % 3] : tint, art.ink, 1.5);
    });
  }
}

function fillWith(ctx, token, region, theme) {
  const found = paintOf(token);
  if (!found) return;
  if (!found.pattern) {
    traceRegion(ctx, region);
    paint(ctx, theme.art.paints[found.colour]);
    return;
  }
  ctx.save();
  traceRegion(ctx, region);
  ctx.clip();
  drawPattern(ctx, found.pattern, found.colour, areaOf(region), theme);
  ctx.restore();
}

function blob(ctx, x, y, radius) {
  ctx.beginPath();
  for (let at = 0; at <= 24; at += 1) {
    const angle = (at * Math.PI * 2) / 24;
    const reach = radius * (0.96 + 0.04 * Math.sin(at * 2.7));
    (at ? ctx.lineTo : ctx.moveTo).call(ctx, x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  ctx.closePath();
}

function spreading(ctx, token, region, spread, theme) {
  if (spread.from) fillWith(ctx, spread.from, region, theme);
  if (spread.progress <= 0) return;
  const [left, top, right, bottom] = areaOf(region);
  const far = Math.max(...[[left, top], [right, top], [left, bottom], [right, bottom]].map(([x, y]) => Math.hypot(x - spread.x, y - spread.y)));
  ctx.save();
  traceRegion(ctx, region);
  ctx.clip();
  blob(ctx, spread.x, spread.y, far * 1.05 * ease(spread.progress));
  ctx.clip();
  fillWith(ctx, token, region, theme);
  ctx.restore();
}

export function drawStamp(ctx, kind, x, y, size, colour, theme) {
  const ink = theme.art.ink;
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (kind === "star") {
    starPath(ctx, 0, 0, s * 0.95, s * 0.45);
    paint(ctx, colour, ink, 2);
  } else if (kind === "heart") {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.8);
    ctx.bezierCurveTo(-s * 1.1, 0, -s * 0.6, -s * 0.95, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.6, -s * 0.95, s * 1.1, 0, 0, s * 0.8);
    ctx.closePath();
    paint(ctx, colour, ink, 2);
  } else if (kind === "flower") {
    for (let at = 0; at < 6; at += 1) ellipse(ctx, Math.cos((at * Math.PI) / 3) * s * 0.52, Math.sin((at * Math.PI) / 3) * s * 0.52, s * 0.42, s * 0.42, colour, ink, 2);
    circle(ctx, 0, 0, s * 0.34, theme.art.tools.star, ink, 2);
  } else if (kind === "leaf") {
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(0, -s, s, 0);
    ctx.quadraticCurveTo(0, s, -s, 0);
    paint(ctx, colour, ink, 2);
  } else if (kind === "paw") {
    ellipse(ctx, 0, s * 0.3, s * 0.55, s * 0.45, colour, ink, 2);
    for (let at = 0; at < 4; at += 1) circle(ctx, Math.cos(Math.PI + ((at + 0.5) * Math.PI) / 4) * s * 0.7, Math.sin(Math.PI + ((at + 0.5) * Math.PI) / 4) * s * 0.62 - s * 0.05, s * 0.22, colour, ink, 2);
  } else {
    roundedRect(ctx, -s * 0.95, -s * 0.15, s * 1.9, s * 0.6, s * 0.2);
    paint(ctx, colour, ink, 2);
    polygon(ctx, [[-s * 0.5, -s * 0.15], [-s * 0.25, -s * 0.6], [s * 0.35, -s * 0.6], [s * 0.62, -s * 0.15]], colour, ink, 2);
    circle(ctx, -s * 0.5, s * 0.48, s * 0.22, ink);
    circle(ctx, s * 0.5, s * 0.48, s * 0.22, ink);
  }
  ctx.restore();
}

function drawLine(ctx, { p, w, pts }, theme, mirrored) {
  ctx.beginPath();
  for (let at = 0; at < pts.length; at += 2) (at ? ctx.lineTo : ctx.moveTo).call(ctx, mirrored ? PAGE_W - pts[at] : pts[at], pts[at + 1]);
  if (pts.length === 2) ctx.lineTo(mirrored ? PAGE_W - pts[0] : pts[0], pts[1]);
  ctx.strokeStyle = theme.art.paints[p];
  ctx.lineWidth = WIDTHS[w];
  ctx.stroke();
}

export function drawItems(ctx, items, theme) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const item of items) {
    for (const mirrored of item.m ? [false, true] : [false]) {
      if (item.k === "l") drawLine(ctx, item, theme, mirrored);
      else drawStamp(ctx, STAMPS[item.t], mirrored ? PAGE_W - item.x : item.x, item.y, 44, theme.art.paints[item.p], theme);
    }
  }
  ctx.restore();
}

function drawDots(ctx, page, fills, theme) {
  const zones = zonesOf(page);
  for (const zone of required(page)) {
    if (fills[zone] !== undefined) continue;
    circle(ctx, ...zones[zone].anchor, DOT, theme.art.paints[page.regions[zone].s]);
  }
}

export function drawSheet(ctx, box, colour, theme) {
  ctx.save();
  ctx.translate(box.x, box.y);
  ctx.scale(box.scale, box.scale);
  withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, () => {
    roundedRect(ctx, 0, 0, PAGE_W, PAGE_H, 12);
    paint(ctx, colour, theme.art.ink, theme.stroke.page);
  });
  ctx.restore();
}

export function drawPage(ctx, page, box, theme, { fills = {}, items = [], spreads = [], dots = true } = {}) {
  const { art, stroke } = theme;
  drawSheet(ctx, box, art.paper, theme);
  ctx.save();
  ctx.translate(box.x, box.y);
  ctx.scale(box.scale, box.scale);
  roundedRect(ctx, 0, 0, PAGE_W, PAGE_H, 12);
  ctx.clip();
  ctx.lineJoin = "round";
  withRim(ctx, { ink: art.ink, colour: art.rim }, () => {
    page.regions.forEach((region, zone) => {
      traceRegion(ctx, region);
      paint(ctx, art.paper);
      const spread = spreads.find((one) => one.zone === zone);
      if (fills[zone] !== undefined) {
        if (spread) spreading(ctx, fills[zone], region, spread, theme);
        else fillWith(ctx, fills[zone], region, theme);
      }
      traceRegion(ctx, region);
      paint(ctx, null, art.ink, stroke.page);
    });
  });
  if (dots) drawDots(ctx, page, fills, theme);
  drawItems(ctx, items, theme);
  ctx.restore();
}
