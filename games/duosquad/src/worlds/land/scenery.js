import { circle, ellipse, hash, line, polygon } from "../../../../../kit/src/canvas/pen.js";

function marks(ctx, zone, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.26;
  for (let at = 0; at < 18; at += 1) {
    const [x, y, size] = [hash(at + 12) * width, hash(at + 43) * height, 3 + hash(at + 80) * 8];
    line(ctx, [[x - size, y], [x, y - 2], [x + size, y]], at % 2 ? zone.light : zone.dark, 1.5);
  }
  ctx.restore();
}

function haze(ctx, zone, width, height, time, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = zone.haze;
  ctx.lineCap = "round";
  for (let at = 0; at < 4; at += 1) {
    const y = height * (0.23 + at * 0.17);
    const drift = Math.sin(time * 0.18 + at * 1.7) * width * 0.06;
    ctx.beginPath();
    ctx.moveTo(-20 + drift, y);
    ctx.bezierCurveTo(width * 0.25 + drift, y - 10, width * 0.63 + drift, y + 13, width + 20 + drift, y - 3);
    ctx.lineWidth = 5 + at * 2;
    ctx.stroke();
  }
  ctx.restore();
}

function rock(ctx, zone, x, y, size, variant, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ellipse(ctx, 5 + Math.sin(time * 0.12) * 2, size * 0.28, size * 0.42, size * 0.14, zone.ink);
  ctx.restore();
  polygon(ctx, [[-size * 0.43, size * 0.2], [-size * 0.35, -size * 0.16], [-size * 0.08, -size * 0.39], [size * 0.35, -size * 0.22], [size * 0.43, size * 0.2]], variant ? zone.rockDark : zone.rock, zone.ink, 2.5);
  polygon(ctx, [[-size * 0.28, -size * 0.14], [-size * 0.07, -size * 0.3], [size * 0.24, -size * 0.17], [size * 0.08, -size * 0.02]], zone.rockLight);
  ctx.restore();
}

function arch(ctx, zone, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  polygon(ctx, [[-0.42, 0.35], [-0.37, -0.32], [-0.16, -0.42], [-0.13, 0.35]], zone.ruin, zone.ink, 2.5 / size);
  polygon(ctx, [[0.13, 0.35], [0.16, -0.42], [0.37, -0.32], [0.42, 0.35]], zone.ruin, zone.ink, 2.5 / size);
  polygon(ctx, [[-0.2, -0.39], [0.2, -0.39], [0.17, -0.2], [-0.17, -0.2]], zone.ruinLight, zone.ink, 2 / size);
  ctx.restore();
}

const PLACES = {
  canyon(ctx, zone, width, height, time) {
    for (const side of [-1, 1]) {
      const at = (share) => (side < 0 ? 0 : width) - side * width * share;
      polygon(ctx, [[at(0), 0], [at(0.17), 0], [at(0.12), height * 0.22], [at(0.2), height * 0.45], [at(0.1), height * 0.72], [at(0.16), height], [at(0), height]], zone.rock);
      line(ctx, [[at(0.1), 0], [at(0.06), height * 0.22], [at(0.12), height * 0.45], [at(0.05), height * 0.72]], zone.rockLight, Math.max(8, width * 0.035));
    }
    rock(ctx, zone, width * 0.11, height * 0.35, Math.min(width, height) * 0.09, 0, time);
    rock(ctx, zone, width * 0.9, height * 0.68, Math.min(width, height) * 0.07, 1, time);
  },
  salt(ctx, zone, width, height) {
    for (let at = 0; at < 12; at += 1) {
      const [x, y, r] = [hash(at + 4) * width, hash(at + 21) * height, 14 + hash(at + 60) * 25];
      polygon(ctx, Array.from({ length: 6 }, (_, side) => [x + Math.cos((side * Math.PI) / 3) * r, y + Math.sin((side * Math.PI) / 3) * r * 0.55]), null, zone.light, 1.5);
    }
    arch(ctx, zone, width * 0.14, height * 0.28, Math.min(width, height) * 0.13);
    arch(ctx, zone, width * 0.88, height * 0.63, Math.min(width, height) * 0.09);
  },
  storm(ctx, zone, width, height, time) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let at = 0; at < 5; at += 1) {
      const y = height * (0.12 + at * 0.19);
      const drift = Math.sin(time * 0.12 + at) * 12;
      polygon(ctx, [[-20 + drift, y], [width * 0.3 + drift, y - 18], [width * 0.7 + drift, y + 8], [width + 20 + drift, y - 12], [width + 20, y + 18], [-20, y + 25]], zone.light);
    }
    ctx.restore();
    for (const x of [width * 0.1, width * 0.9]) {
      ctx.save();
      ctx.globalAlpha = 0.14 + Math.sin(time * 1.1 + x) * 0.05;
      circle(ctx, x, height * 0.38, 32, zone.glow);
      ctx.restore();
      circle(ctx, x, height * 0.38, 15, zone.glowDark, zone.ink, 2);
      circle(ctx, x, height * 0.38, 8, zone.glow, zone.glowLight, 2);
    }
  },
};

export function drawScenery(ctx, { x, y, w, h }, zone, look, time = 0) {
  const place = PLACES[zone] ? zone : "canyon";
  const colours = look.zones[place];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = colours.sky;
  ctx.fillRect(x, y, w, h);
  ctx.translate(x, y);
  marks(ctx, colours, w, h);
  PLACES[place](ctx, colours, w, h, time);
  haze(ctx, colours, w, h, time, place === "storm" ? 0.12 : 0.18);
  ctx.restore();
}
