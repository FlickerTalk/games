import { TAU, circle as round, ellipse as oval, line as stroke, paint as fillPath, polygon as shape, starPath } from "../../../kit/src/canvas/pen.js";

const GLOWING = new Set([6, 8, 11, 13, 21]);

function kit(ctx, o) {
  const ink = o.ink;
  return {
    ctx,
    o,
    circle: (x, y, r, fill, line = ink, width = 3) => round(ctx, x, y, r, fill, line, width),
    ellipse: (x, y, rx, ry, fill, line = ink, width = 3) => oval(ctx, x, y, rx, ry, fill, line, width),
    polygon: (points, fill, line = ink, width = 3) => shape(ctx, points, fill, line, width),
    line: (points, colour, width) => stroke(ctx, points, colour, width),
    paint: (fill, line = ink, width = 3) => fillPath(ctx, fill, line, width),
    detail: (colour) => (o.silhouette ? o.colour : colour),
  };
}

function eye(p, x, y, scale = 1) {
  if (p.o.silhouette) return;
  p.circle(x, y, 2.1 * scale, p.o.ink, null, 0);
  p.circle(x + 0.55 * scale, y - 0.65 * scale, 0.55 * scale, p.o.white, null, 0);
}

function mouth(p, x, y, width = 4) {
  if (!p.o.smile || p.o.silhouette) return;
  p.ctx.beginPath();
  p.ctx.arc(x, y - width * 0.4, width, Math.PI * 0.2, Math.PI * 0.8);
  p.paint(null, p.o.ink, 1.6);
}

function gill(p, x, y, size = 8) {
  if (p.o.silhouette) return;
  p.ctx.beginPath();
  p.ctx.arc(x, y, size, Math.PI * 0.55, Math.PI * 1.35);
  p.paint(null, p.o.ink, 1.6);
}

function tail(p, x, y, size, wave = 0) {
  p.polygon([[x, y], [x - size, y - size * 0.75 + wave], [x - size * 0.72, y], [x - size, y + size * 0.75 + wave]], p.o.colour);
}

function spots(p, points, colour) {
  if (p.o.silhouette) return;
  for (const [x, y, radius] of points) p.circle(x, y, radius, colour, null, 0);
}

function ribbonFish(p, wave) {
  const { colour } = p.o;
  tail(p, -34, 0, 17, wave);
  p.ellipse(0, 0, 38, 9, colour);
  p.polygon([[-28, -7], [-13, -19], [5, -17], [24, -7]], colour);
  p.polygon([[-7, 7], [4, 16], [11, 7]], colour);
  if (!p.o.silhouette) p.line([[-25, 2], [19, 2]], p.o.white, 1.5);
  gill(p, 23, 0, 6);
  eye(p, 29, -3, 0.8);
  mouth(p, 33, 4, 3);
}

function angelFish(p, wave) {
  const { colour, detail } = p.o;
  tail(p, -25, 0, 19, wave);
  p.polygon([[-27, 0], [-5, -30], [21, -23], [34, 0], [19, 23], [-5, 30]], colour);
  p.polygon([[-6, -27], [1, -39], [10, -27]], colour);
  p.polygon([[-5, 27], [3, 40], [12, 25]], colour);
  if (!p.o.silhouette) for (const x of [-8, 3, 14]) p.line([[x, -21 + Math.abs(x) * 0.25], [x + 4, 20 - Math.abs(x) * 0.2]], detail.redDark, 2.3);
  gill(p, 21, 0, 8);
  eye(p, 23, -6, 0.9);
  mouth(p, 28, 5, 3.5);
}

function sunfish(p, wave) {
  const { colour, detail } = p.o;
  tail(p, -29, 1, 18, wave);
  p.ellipse(0, 0, 29, 31, colour);
  p.polygon([[-15, -24], [-5, -41], [7, -30]], colour);
  p.polygon([[-13, 25], [-2, 39], [10, 28]], colour);
  gill(p, 15, 0, 11);
  spots(p, [[-12, -12, 2], [-16, 4, 1.5], [-4, 15, 2], [4, -19, 1.5]], detail.orange);
  eye(p, 17, -8, 0.9);
  mouth(p, 22, 6, 3.5);
}

function sprat(p, wave) {
  const { colour, detail } = p.o;
  tail(p, -27, 0, 19, wave);
  p.ellipse(1, 0, 32, 15, colour);
  p.polygon([[-13, -12], [-3, -25], [10, -14]], colour);
  p.polygon([[-5, 12], [5, 22], [12, 12]], colour);
  if (!p.o.silhouette) p.line([[-20, 3], [15, 3]], detail.cream, 1.5);
  gill(p, 19, 0, 8);
  eye(p, 23, -4, 0.85);
  mouth(p, 27, 5, 3);
}

function seahorse(p) {
  const { ctx, o } = p;
  const sway = Math.sin(o.time * 3) * 2;
  ctx.beginPath();
  ctx.moveTo(-4, -27);
  ctx.bezierCurveTo(25, -35, 26, -8, 8, -7);
  ctx.bezierCurveTo(-8, 2, 18, 16, 2, 29);
  ctx.bezierCurveTo(-17, 39, -25, 20, -10, 16);
  ctx.bezierCurveTo(-1, 24, 6, 22, 1, 16);
  ctx.bezierCurveTo(-18, 0, -17, -19, -4, -27);
  p.paint(o.colour);
  p.polygon([[6, -24], [28 + sway, -20], [9, -15]], o.colour);
  p.polygon([[-7, -27], [-8, -37], [0, -31], [5, -36], [7, -28]], o.colour);
  p.ellipse(-12, -4 + sway, 9, 15, o.colour);
  if (!o.silhouette) {
    for (let y = -5; y < 20; y += 7) p.line([[-6, y], [5, y + 2]], o.detail.redDark, 1.4);
    p.line([[5, -20], [19, -20]], o.detail.cream, 1.3);
  }
  eye(p, 9, -24, 0.75);
  mouth(p, 14, -17, 2.5);
}

function crab(p, lobster = false) {
  const { o } = p;
  const lift = Math.sin(o.time * 4) * 3;
  p.ellipse(0, 5, lobster ? 25 : 28, lobster ? 14 : 20, o.colour);
  for (const side of [-1, 1]) {
    p.line([[side * 16, 13], [side * 29, 24], [side * 36, 21]], o.colour, 5);
    p.line([[side * 19, 7], [side * 34, 12], [side * 39, 8]], o.colour, 5);
    p.line([[side * 18, -2], [side * 31, -12 - lift * side]], o.colour, 5);
    p.ellipse(side * 36, -15 - lift * side, 10, 8, o.colour);
    p.polygon([[side * 37, -17 - lift * side], [side * 47, -24 - lift * side], [side * 44, -11 - lift * side]], o.colour);
    p.line([[side * 8, -8], [side * 10, -17]], o.colour, 3);
    eye(p, side * 10, -18, 0.8);
  }
  if (lobster) {
    tail(p, -25, 7, 19, Math.sin(o.time * 5) * 2);
    if (!o.silhouette) p.line([[-15, -7], [14, -7]], o.detail.redDark, 2);
    for (const side of [-1, 1]) p.line([[side * 13, -9], [side * 32, -31], [side * 44, -34]], o.ink, 1.5);
  } else if (!o.silhouette) {
    p.ctx.beginPath();
    p.ctx.arc(0, 3, 17, Math.PI * 1.1, Math.PI * 1.9);
    p.paint(null, o.detail.redDark, 2);
  }
  mouth(p, 0, 8, 4);
}

function turtle(p) {
  const { o } = p;
  const paddle = Math.sin(o.time * 4) * 4;
  p.ellipse(-2, 1, 27, 21, p.detail(o.detail.green));
  p.ellipse(29, -2, 12, 10, o.colour);
  p.ellipse(-17, -18 - paddle, 12, 7, o.colour);
  p.ellipse(13, 18 + paddle, 12, 7, o.colour);
  p.polygon([[-28, 0], [-38, -6], [-36, 7]], o.colour);
  if (!o.silhouette) {
    p.polygon([[-10, -10], [5, -12], [14, 0], [5, 12], [-10, 10], [-17, 0]], o.detail.greenLight, o.ink, 1.5);
    p.line([[-17, -10], [-10, -10]], o.ink, 1.5);
    p.line([[12, 11], [5, 12]], o.ink, 1.5);
  }
  eye(p, 33, -5, 0.75);
  mouth(p, 35, 2, 3);
}

function jelly(p) {
  const { ctx, o } = p;
  const drift = Math.sin(o.time * 3) * 3;
  ctx.beginPath();
  ctx.moveTo(-28, 3);
  ctx.bezierCurveTo(-28, -38, 28, -38, 28, 3);
  ctx.quadraticCurveTo(17, 13, 9, 3);
  ctx.quadraticCurveTo(0, 13, -9, 3);
  ctx.quadraticCurveTo(-18, 13, -28, 3);
  p.paint(o.colour);
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 10, 7);
    ctx.bezierCurveTo(i * 10 + drift, 18, i * 10 - drift, 28, i * 10, 37);
    p.paint(null, o.colour, i % 2 ? 2.5 : 4);
  }
  if (!o.silhouette) {
    for (const x of [-13, 0, 13]) {
      ctx.beginPath();
      ctx.arc(x, -5, 9, Math.PI * 0.1, Math.PI * 0.9);
      p.paint(null, o.detail.cream, 1.5);
    }
  }
  mouth(p, 0, -12, 4);
}

function octopus(p) {
  const { ctx, o } = p;
  const wiggle = Math.sin(o.time * 4) * 3;
  p.ellipse(0, -9, 24, 27, o.colour);
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 6, 8);
    ctx.quadraticCurveTo(i * 9 + wiggle, 25, i * 9, 32);
    p.paint(null, o.colour, 6);
  }
  if (!o.silhouette) {
    eye(p, -8, -12, 0.9);
    eye(p, 8, -12, 0.9);
    for (const x of [-17, -6, 6, 17]) p.circle(x, 22, 1.5, o.detail.cream, null, 0);
    ctx.beginPath();
    ctx.arc(0, -12, 15, Math.PI * 1.15, Math.PI * 1.85);
    p.paint(null, o.detail.purple, 1.5);
  }
  mouth(p, 0, -3, 4);
}

function squid(p) {
  const { o } = p;
  p.polygon([[0, -38], [25, -4], [18, 15], [-18, 15], [-25, -4]], o.colour);
  p.polygon([[-16, -13], [-34, -25], [-25, 2]], o.colour);
  p.polygon([[16, -13], [34, -25], [25, 2]], o.colour);
  for (let i = -2; i <= 2; i += 1) p.line([[i * 7, 13], [i * 9, 29], [i * 10 + Math.sin(o.time * 4 + i) * 3, 35]], o.colour, i === 0 ? 3 : 4);
  if (!o.silhouette) {
    p.line([[0, -29], [0, 3]], o.detail.cream, 1.5);
    eye(p, -8, 1, 0.85);
    eye(p, 8, 1, 0.85);
  }
  mouth(p, 0, 9, 3.5);
}

function seaStar(p) {
  const { ctx, o } = p;
  ctx.save();
  ctx.rotate(Math.sin(o.time * 2) * 0.08);
  starPath(ctx, 0, 0, 37, 17);
  p.paint(o.colour);
  spots(p, [[0, 0, 3], [-10, -7, 2], [11, -8, 2], [-6, 13, 2], [15, 12, 1.8], [0, -20, 1.8]], o.detail.shell);
  if (!o.silhouette) p.circle(0, 0, 8, null, o.detail.redDark, 1.4);
  mouth(p, 0, 6, 4);
  ctx.restore();
}

function scallop(p) {
  const { ctx, o } = p;
  ctx.beginPath();
  ctx.moveTo(-31, 20);
  ctx.bezierCurveTo(-43, -18, -18, -37, 0, -25);
  ctx.bezierCurveTo(18, -37, 43, -18, 31, 20);
  ctx.quadraticCurveTo(0, 35, -31, 20);
  p.paint(o.colour);
  for (let i = -3; i <= 3; i += 1) p.line([[0, 23], [i * 10, -20 + Math.abs(i) * 4]], p.detail(o.detail.redDark), 1.6);
  if (!o.silhouette) p.line([[-26, 18], [26, 18]], o.detail.cream, 2);
  mouth(p, 0, 12, 5);
}

function puffer(p) {
  const { ctx, o } = p;
  const pulse = 1 + Math.sin(o.time * 3) * 0.025;
  ctx.save();
  ctx.scale(pulse, pulse);
  for (let i = 0; i < 12; i += 1) {
    const a = (i * TAU) / 12;
    p.polygon([[Math.cos(a) * 24, Math.sin(a) * 24], [Math.cos(a) * 36, Math.sin(a) * 36], [Math.cos(a + 0.18) * 24, Math.sin(a + 0.18) * 24]], o.colour);
  }
  p.circle(0, 0, 28, o.colour);
  tail(p, -25, 3, 13, Math.sin(o.time * 5) * 2);
  p.ellipse(1, 22, 9, 5, o.colour);
  spots(p, [[-13, -11, 2], [-17, 3, 1.5], [-5, 13, 2], [7, -17, 1.7], [11, 10, 1.5]], o.detail.orange);
  gill(p, 12, 2, 7);
  eye(p, 13, -7, 0.9);
  mouth(p, 20, 4, 3.5);
  ctx.restore();
}

function ray(p) {
  const { ctx, o } = p;
  const flap = Math.sin(o.time * 3) * 6;
  p.polygon([[-39, flap], [-12, -19], [18, -16], [37, 3], [9, 21], [-15, 17]], o.colour);
  ctx.beginPath();
  ctx.moveTo(-13, 14);
  ctx.quadraticCurveTo(-37, 26, -45, 38 + flap);
  p.paint(null, o.colour, 3);
  if (!o.silhouette) p.line([[-26, flap * 0.5], [9, 12]], o.detail.aquaLight, 1.5);
  spots(p, [[-8, -6, 2], [7, -8, 1.5], [13, 8, 2], [-14, 8, 1.5]], o.detail.aquaLight);
  eye(p, 20, -5, 0.75);
  mouth(p, 25, 2, 3);
}

function eel(p) {
  const { ctx, o } = p;
  const wave = Math.sin(o.time * 4) * 5;
  ctx.beginPath();
  ctx.moveTo(-40, 12);
  ctx.bezierCurveTo(-18, -30 + wave, 3, 30 - wave, 30, -6);
  ctx.bezierCurveTo(43, -19, 42, 11, 27, 12);
  ctx.bezierCurveTo(3, 38 - wave, -19, -12 + wave, -34, 22);
  ctx.closePath();
  p.paint(o.colour);
  if (!o.silhouette) {
    ctx.beginPath();
    ctx.moveTo(-34, 10);
    ctx.bezierCurveTo(-14, -20 + wave, 4, 23 - wave, 26, -5);
    p.paint(null, o.detail.cream, 1.6);
  }
  gill(p, 28, 3, 6);
  eye(p, 31, -5, 0.75);
  mouth(p, 35, 3, 2.5);
}

function shrimp(p) {
  const { ctx, o } = p;
  const curl = Math.sin(o.time * 4) * 2;
  ctx.beginPath();
  ctx.moveTo(25, -17);
  ctx.bezierCurveTo(-13, -36, -37, -4, -17, 23);
  ctx.bezierCurveTo(-2, 39, 14, 23, 5, 15);
  ctx.bezierCurveTo(-9, 28, -22, 9, -12, -2);
  ctx.bezierCurveTo(-2, -15, 13, -6, 25, -17);
  p.paint(o.colour);
  tail(p, -13, 22, 15, curl);
  p.line([[22, -16], [38, -30], [45, -27]], o.ink, 1.4);
  p.line([[20, -14], [39, -18], [44, -14]], o.ink, 1.2);
  if (!o.silhouette) {
    for (const [x, y] of [[-17, 1], [-14, 11], [-6, 20], [5, 20]]) {
      ctx.beginPath();
      ctx.arc(x, y, 8, Math.PI * 0.1, Math.PI * 0.8);
      p.paint(null, o.detail.redDark, 1.5);
    }
  }
  eye(p, 20, -17, 0.75);
  mouth(p, 22, -10, 2.5);
}

function whale(p, dolphin = false) {
  const { ctx, o } = p;
  tail(p, -30, 4, 20, Math.sin(o.time * 3) * 4);
  ctx.beginPath();
  ctx.moveTo(-30, 4);
  ctx.bezierCurveTo(-20, -29, 24, -33, 38, -4);
  ctx.bezierCurveTo(45, 14, 17, 27, -8, 21);
  ctx.bezierCurveTo(-20, 18, -26, 11, -30, 4);
  p.paint(o.colour);
  p.polygon(dolphin ? [[-7, -22], [1, -39], [10, -23]] : [[-6, -21], [1, -31], [8, -23]], o.colour);
  p.ellipse(4, 18, 13, 5, o.colour);
  if (dolphin) p.polygon([[31, -7], [49, -2], [34, 4]], o.colour);
  if (!o.silhouette) {
    ctx.beginPath();
    ctx.moveTo(-20, 12);
    ctx.quadraticCurveTo(8, 27, 32, 8);
    p.paint(null, o.detail.aquaLight, 2);
    p.line([[27, 3], [37, 2]], o.ink, 1.5);
    if (!dolphin) {
      p.line([[5, -25], [1, -34], [-4, -38]], o.detail.aquaLight, 2.5);
      p.line([[5, -25], [9, -35], [14, -37]], o.detail.aquaLight, 2);
    }
  }
  eye(p, 28, -8, 0.8);
  mouth(p, 31, -1, 3);
}

function seal(p) {
  const { o } = p;
  p.ellipse(-5, 3, 31, 19, o.colour);
  p.circle(24, -10, 16, o.colour);
  p.polygon([[-31, 2], [-43, -10], [-40, 12]], o.colour);
  p.ellipse(2, 18 + Math.sin(o.time * 4) * 2, 15, 6, o.colour);
  p.ellipse(13, 7, 8, 13, o.colour);
  eye(p, 29, -14, 0.8);
  if (!o.silhouette) {
    p.circle(36, -7, 2, o.ink, null, 0);
    for (const offset of [-5, 1, 6]) p.line([[35, -5], [46, offset]], o.ink, 1.2);
    p.line([[-24, 4], [-8, 9]], o.detail.silver, 1.5);
  }
  mouth(p, 32, -1, 3);
}

function hermit(p) {
  const { ctx, o } = p;
  p.circle(-8, -4, 25, p.detail(o.detail.shell));
  if (!o.silhouette) {
    ctx.beginPath();
    ctx.arc(-8, -4, 14, 0, TAU * 0.88);
    p.paint(null, o.detail.woodDark, 2.5);
    ctx.beginPath();
    ctx.arc(-8, -4, 7, 0, TAU * 0.8);
    p.paint(null, o.detail.woodDark, 1.5);
  }
  p.ellipse(20, 12, 17, 11, o.colour);
  for (const x of [11, 26]) p.line([[x, 18], [x - 5, 29]], o.colour, 4);
  p.line([[22, 4], [27, -5]], o.colour, 2.5);
  eye(p, 28, -6, 0.75);
  mouth(p, 28, 13, 3);
}

function nautilus(p) {
  const { ctx, o } = p;
  p.circle(-3, 0, 30, o.colour);
  p.polygon([[16, 8], [37, 0], [32, 21], [13, 23]], p.detail(o.detail.shell));
  for (let i = 0; i < 5; i += 1) p.line([[23 + i * 3, 17], [26 + i * 4, 32 + Math.sin(o.time * 3 + i) * 2]], p.detail(o.detail.shell), 2.5);
  if (!o.silhouette) {
    ctx.beginPath();
    ctx.arc(-3, 0, 19, 0, TAU * 0.9);
    p.paint(null, o.detail.woodDark, 2);
    for (const x of [-21, -10, 2, 13]) p.line([[x, -22], [x + 5, -14]], o.detail.woodDark, 2);
  }
  eye(p, 28, 7, 0.7);
  mouth(p, 31, 13, 2.5);
}

function seaBunny(p) {
  const { o } = p;
  p.ellipse(0, 7, 30, 18, o.colour);
  p.ellipse(-9, -15, 4, 16, o.colour);
  p.ellipse(9, -16, 4, 17, o.colour);
  for (let i = -3; i <= 3; i += 1) p.circle(i * 8, 23 + Math.sin(o.time * 3 + i), 3, o.colour, null, 0);
  spots(p, [[-17, 3, 2], [-7, 11, 1.5], [5, 1, 2], [17, 10, 1.7]], o.detail.cream);
  if (!o.silhouette) {
    p.line([[-12, -25], [-8, -28]], o.detail.redDark, 1.4);
    p.line([[7, -28], [11, -25]], o.detail.redDark, 1.4);
  }
  eye(p, 19, 1, 0.6);
  mouth(p, 21, 7, 2.5);
}

function leafFish(p) {
  const { ctx, o } = p;
  const wave = Math.sin(o.time * 3) * 4;
  tail(p, -25, 4, 17, wave);
  ctx.beginPath();
  ctx.moveTo(-25, 4);
  ctx.bezierCurveTo(-18, -29, 20, -34, 32, -3);
  ctx.bezierCurveTo(20, 28, -13, 31, -25, 4);
  p.paint(o.colour);
  p.polygon([[-3, -23], [2, -38], [10, -24]], o.colour);
  if (!o.silhouette) {
    p.line([[-18, 8], [23, -6]], o.detail.greenLight, 2);
    for (const x of [-10, 0, 10]) {
      p.line([[x, 3], [x - 5, -10]], o.detail.greenLight, 1.2);
      p.line([[x, 3], [x + 4, 13]], o.detail.greenLight, 1.2);
    }
  }
  eye(p, 21, -8, 0.75);
  mouth(p, 25, -2, 3);
}

const DRAW = [
  (p, wave) => sprat(p, wave), ribbonFish, angelFish, seahorse, (p) => crab(p), turtle, jelly, octopus, squid, seaStar, scallop, puffer,
  ray, eel, shrimp, (p) => whale(p), (p) => whale(p, true), seal, (p) => crab(p, true), hermit, nautilus, seaBunny, leafFish, sunfish,
];

const kindOf = (kind) => (Number.isInteger(kind) && kind >= 0 && kind < DRAW.length ? kind : 0);

export function drawCreature(ctx, x, y, size, kind, theme, options = {}) {
  const index = kindOf(kind);
  const { direction = 1, silhouette = false, night = false, smile = false, time = 0 } = options;
  const { art } = theme;
  const tint = night && GLOWING.has(index) ? art.glow : art.creatures[index];
  const colour = silhouette ? art.silhouette : tint;
  const o = { colour, time, silhouette, smile, ink: silhouette ? art.silhouette : art.ink, white: art.white, detail: art.detail };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((direction < 0 ? -size : size) / 80, size / 80);
  DRAW[index](kit(ctx, o), Math.sin(time * 5) * 3);
  ctx.restore();
}
