import { ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { rimmed } from "./rim.js";

function cloudPath(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.42, y + h * 0.25);
  ctx.bezierCurveTo(x - w * 0.58, y, x - w * 0.38, y - h * 0.2, x - w * 0.25, y - h * 0.08);
  ctx.bezierCurveTo(x - w * 0.28, y - h * 0.45, x + w * 0.05, y - h * 0.55, x + w * 0.16, y - h * 0.2);
  ctx.bezierCurveTo(x + w * 0.4, y - h * 0.3, x + w * 0.55, y, x + w * 0.4, y + h * 0.2);
  ctx.bezierCurveTo(x + w * 0.15, y + h * 0.43, x - w * 0.2, y + h * 0.4, x - w * 0.42, y + h * 0.25);
  ctx.closePath();
}

export function drawCloud(ctx, x, y, size, theme, { time = 0 } = {}) {
  const { weather, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 1.4) * 2);
  ctx.globalAlpha = 0.9;
  cloudPath(ctx, 0, 0, size, size * 0.72);
  paint(ctx, weather.cloud, ink, 2);
  cloudPath(ctx, -size * 0.08, -size * 0.1, size * 0.55, size * 0.3);
  paint(ctx, weather.cloudLight, null, 0);
  ctx.restore();
}

export function drawRainbowRing(ctx, x, y, radius, theme, { time = 0, lit = 0 } = {}) {
  const { rainbow, effects } = theme.art;
  const band = radius * 0.09;
  ctx.save();
  ctx.translate(x, y);
  rainbow.forEach((colour, at) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius - band / 2 - at * band, 0, Math.PI * 2);
    paint(ctx, null, colour, band);
  });
  if (lit > 0 && lit < 1) {
    ctx.globalAlpha = 1 - lit;
    for (let at = 0; at < 8; at += 1) {
      const turn = (at * Math.PI) / 4 + time;
      const [from, to] = [radius * (1.05 + lit * 0.2), radius * (1.25 + lit * 0.4)];
      line(ctx, [[Math.cos(turn) * from, Math.sin(turn) * from], [Math.cos(turn) * to, Math.sin(turn) * to]], effects.spark, 3);
    }
  }
  ctx.restore();
}

// way: 1 pushes toward the right of the area, -1 toward its left
export function drawWindStream(ctx, area, way, theme, { time = 0, upright = false } = {}) {
  const { weather, ink } = theme.art;
  const [long, tall] = upright ? [area.h, area.w] : [area.w, area.h];
  ctx.save();
  ctx.translate(area.x + area.w / 2, area.y + area.h / 2);
  if (upright) ctx.rotate(-Math.PI / 2);
  ctx.scale(way < 0 ? -1 : 1, 1);
  ctx.globalAlpha = 0.72;
  ctx.lineCap = "round";
  for (let at = 0; at < 3; at += 1) {
    const y = (at - 1) * tall * 0.28;
    const shift = ((time * 0.35 + at * 0.37) % 1) * long * 0.5 - long * 0.25;
    const [from, to] = [shift - long * 0.14, shift + long * 0.14];
    ctx.beginPath();
    ctx.moveTo(from, y);
    ctx.bezierCurveTo(from + long * 0.08, y - tall * 0.1, to - long * 0.1, y + tall * 0.1, to, y);
    paint(ctx, null, weather.wind, 4);
    polygon(ctx, [[to + 10, y], [to - 5, y - 7], [to - 5, y + 7]], weather.wind, ink, 1.5);
  }
  ctx.restore();
}

export function drawAirship(ctx, x, y, size, theme, { time = 0, way = 1 } = {}) {
  const { airship, ink } = theme.art;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 0.8) * 2);
  ctx.scale((size / 156) * (way < 0 ? -1 : 1), size / 156);
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    polygon(ctx, [[-59, -9], [-76, -25], [-72, 0], [-76, 25], [-58, 10]], airship.fin, ink, 3);
    ellipse(ctx, 0, 0, 67, 34, airship.body, ink, 3);
  });
  ctx.beginPath();
  ctx.ellipse(0, -5, 58, 19, 0, Math.PI, Math.PI * 2);
  paint(ctx, airship.top, null, 0);
  line(ctx, [[-22, -29], [-22, 29]], ink, 2);
  line(ctx, [[22, -29], [22, 29]], ink, 2);
  roundedRect(ctx, -23, 26, 46, 14, 7);
  paint(ctx, airship.cabin, ink, 2);
  ellipse(ctx, -10, 33, 4, 4, airship.glass, ink, 1);
  ellipse(ctx, 10, 33, 4, 4, airship.glass, ink, 1);
  ctx.restore();
}
