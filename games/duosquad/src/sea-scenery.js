import { circle, ellipse, hash, line, polygon } from "../../../kit/src/canvas/pen.js";
import { bubbles } from "./sea-effects.js";

function shafts(ctx, zone, width, height, time) {
  ctx.save();
  ctx.globalAlpha = 0.055;
  for (let at = 0; at < 4; at += 1) {
    const x = width * (0.08 + at * 0.26) + Math.sin(time * 0.08 + at) * width * 0.025;
    polygon(ctx, [[x, 0], [x + width * 0.09, 0], [x + width * 0.24, height * 0.82], [x + width * 0.08, height * 0.82]], zone.shaft);
  }
  ctx.restore();
}

function dust(ctx, zone, width, height, time, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const count = Math.round((width * height) / 12000);
  for (let at = 0; at < count; at += 1) {
    const x = hash(at + 4) * width + Math.sin(time * 0.12 + at) * 4;
    const y = (((hash(at + 40) * height - time * (1.5 + hash(at) * 2)) % height) + height) % height;
    circle(ctx, x, y, 0.8 + hash(at + 8) * 1.7, zone.dust);
  }
  ctx.restore();
}

function giants(ctx, zone, width, height, time) {
  ctx.save();
  ctx.globalAlpha = 0.2;
  for (let at = 0; at < 3; at += 1) {
    const direction = at % 2 ? -1 : 1;
    const y = height * (0.16 + at * 0.18);
    const drift = Math.sin(time * 0.09 + at * 2) * width * 0.08;
    ctx.beginPath();
    ctx.moveTo(direction * width * 0.18 + drift, y);
    ctx.bezierCurveTo(width * 0.3, y - height * 0.11, width * 0.66, y + height * 0.1, width * 1.12, y - height * 0.03);
    ctx.strokeStyle = zone.ink;
    ctx.lineWidth = height * (0.035 + at * 0.008);
    ctx.lineCap = "round";
    ctx.stroke();
    const head = (direction > 0 ? width * 0.13 : width * 0.87) + drift;
    polygon(ctx, [[head - 25, y - 13], [head + 8, y - 29], [head + 34, y - 4], [head + 13, y + 24], [head - 24, y + 15]], zone.ink);
    polygon(ctx, [[head - 7, y - 23], [head + 2, y - 49], [head + 12, y - 23]], zone.ink);
  }
  ctx.restore();
}

function reef(ctx, zone, width, height, time) {
  polygon(ctx, [[0, height * 0.48], [width * 0.15, height * 0.58], [width * 0.2, height], [0, height]], zone.reefDark);
  polygon(ctx, [[width, height * 0.38], [width * 0.86, height * 0.55], [width * 0.8, height], [width, height]], zone.reef);
  ctx.save();
  ctx.globalAlpha = 0.18 + Math.sin(time * 0.35) * 0.03;
  line(ctx, [[width * 0.68, 0], [width * 0.6, height * 0.12], [width * 0.66, height * 0.16], [width * 0.56, height * 0.3]], zone.shaft, 4);
  ctx.restore();
  for (let at = 0; at < 6; at += 1) {
    const side = at % 2 ? 1 : -1;
    const x = side < 0 ? width * 0.05 : width * 0.95;
    const y = height * (0.66 + at * 0.052);
    const colour = at % 3 ? zone.rust : zone.violet;
    line(ctx, [[x, y + 45], [x + side * 7, y], [x + side * 23, y - 21]], colour, 9);
    line(ctx, [[x + side * 5, y + 10], [x - side * 15, y - 8]], colour, 7);
    polygon(ctx, [[x + side * 17, y - 18], [x + side * 24, y - 34], [x + side * 29, y - 17]], zone.bone, zone.ink, 2);
  }
}

function stem(ctx, zone, x, y, length, time, phase) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - 25, y - length * 0.35, x + Math.sin(time * 0.3 + phase) * 16, y - length * 0.65, x + 8, y - length);
  ctx.strokeStyle = zone.kelp;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();
  for (let at = 1; at < 5; at += 1) ellipse(ctx, x + (at % 2 ? 10 : -10), y - (length * at) / 5, 15, 6, zone.kelpLight, zone.ink, 1.5);
}

function wreck(ctx, zone, x, y, size) {
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.translate(x, y);
  ctx.rotate(-0.15);
  ctx.scale(size / 180, size / 180);
  polygon(ctx, [[-86, -26], [72, -37], [89, 16], [52, 44], [-64, 37]], zone.wreck, zone.ink, 5);
  polygon(ctx, [[-74, -19], [66, -28], [52, -7], [-58, 2]], zone.wreckLight, zone.ink, 3);
  for (const wx of [-42, -7, 28]) {
    circle(ctx, wx, 15, 11, zone.floor, zone.ink, 4);
    circle(ctx, wx, 15, 5, zone.window);
  }
  line(ctx, [[-11, -30], [-4, -80], [36, -53]], zone.wreckLight, 7);
  line(ctx, [[-4, -78], [-43, -57]], zone.wreckLight, 5);
  polygon(ctx, [[0, -73], [31, -54], [1, -46]], zone.sail, zone.ink, 3);
  line(ctx, [[-63, 32], [-26, 8], [7, 35], [44, 8]], zone.ink, 4);
  ctx.restore();
}

function kelp(ctx, zone, width, height, time) {
  polygon(ctx, [[0, height * 0.25], [width * 0.13, height * 0.42], [width * 0.21, height], [0, height]], zone.wall);
  polygon(ctx, [[width, height * 0.2], [width * 0.87, height * 0.4], [width * 0.79, height], [width, height]], zone.wall);
  for (let at = 0; at < 6; at += 1) {
    const x = at % 2 ? width * (0.83 + hash(at) * 0.15) : width * (0.02 + hash(at) * 0.15);
    stem(ctx, zone, x, height, height * (0.25 + hash(at + 4) * 0.35), time, at);
  }
  wreck(ctx, zone, width * 0.72, height * 0.67, width * 0.33);
}

function trench(ctx, zone, width, height, time) {
  polygon(ctx, [[0, height * 0.55], [width * 0.12, height * 0.66], [width * 0.18, height], [0, height]], zone.vent);
  polygon(ctx, [[width, height * 0.48], [width * 0.87, height * 0.7], [width * 0.82, height], [width, height]], zone.sky);
  for (let at = 0; at < 5; at += 1) {
    const [x, y] = [width * (0.07 + at * 0.22), height * (0.88 + (at % 2) * 0.06)];
    polygon(ctx, [[x - 18, y], [x - 10, y - 48], [x + 9, y - 56], [x + 20, y]], zone.vent, zone.ink, 2);
    ellipse(ctx, x, y - 53, 10, 4, zone.rust, zone.ink, 2);
    bubbles(ctx, x, y - 55, 65, time + at, 3, zone.steam);
  }
  for (let at = 0; at < 12; at += 1) {
    const [x, y] = [hash(at + 90) * width, height * (0.2 + hash(at + 120) * 0.6)];
    const pulse = 2 + Math.sin(time * 1.2 + at) * 0.7;
    circle(ctx, x, y, pulse + 3, zone.glowDark);
    circle(ctx, x, y, pulse, zone.glow);
  }
}

const PLACES = { reef, kelp, trench };

export function drawScenery(ctx, { x, y, w, h }, zone, look, time = 0) {
  const place = PLACES[zone] ? zone : "reef";
  const colours = look.zones[place];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = colours.sky;
  ctx.fillRect(x, y, w, h);
  ctx.translate(x, y);
  [colours.mid, colours.low, colours.floor].forEach((colour, at) => {
    ctx.fillStyle = colour;
    ctx.fillRect(0, (h * (at + 1)) / 4, w, h / 4 + 1);
  });
  giants(ctx, colours, w, h, time);
  shafts(ctx, colours, w, h, time);
  PLACES[place](ctx, colours, w, h, time);
  dust(ctx, colours, w, h, time, place === "trench" ? 0.5 : 0.3);
  ctx.restore();
}
