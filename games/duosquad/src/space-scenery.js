import { circle, hash, line, polygon } from "../../../kit/src/canvas/pen.js";

function stars(ctx, zone, width, height, time) {
  const count = Math.round((width * height) / 19000);
  ctx.save();
  for (let at = 0; at < count; at += 1) {
    const x = hash(at + 4) * width;
    const y = (hash(at + 17) * height + time * (2 + hash(at + 31) * 4)) % height;
    const size = 0.8 + hash(at + 48) * 1.5;
    ctx.globalAlpha = 0.25 + hash(at + 70) * 0.55;
    if (at % 9 === 0) {
      line(ctx, [[x - size * 2, y], [x + size * 2, y]], zone.starBright, 1);
      line(ctx, [[x, y - size * 2], [x, y + size * 2]], zone.starBright, 1);
    } else circle(ctx, x, y, size, at % 3 ? zone.star : zone.starDim);
  }
  ctx.restore();
}

function ring(ctx, size, colour, width, from = 0, to = Math.PI * 2) {
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.67, size * 0.18, 0, from, to);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}

function planet(ctx, zone, x, y, size, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.22 + Math.sin(time * 0.15) * 0.015);
  ring(ctx, size, zone.ink, size * 0.11);
  ring(ctx, size, zone.ring, size * 0.065);
  circle(ctx, 0, 0, size * 0.38, zone.planet, zone.ink, 3);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.29, -1.3, 1.45);
  ctx.strokeStyle = zone.planetLight;
  ctx.lineWidth = size * 0.11;
  ctx.stroke();
  ring(ctx, size, zone.ring, size * 0.065, 0.08, Math.PI - 0.08);
  ctx.restore();
}

function asteroid(ctx, zone, x, y, size, angle, variant = 0) {
  const stretch = variant % 2 ? 0.85 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  polygon(ctx, [[-size * 0.45, -size * 0.15], [-size * 0.2, -size * 0.43], [size * 0.28, -size * 0.36 * stretch], [size * 0.47, size * 0.04], [size * 0.18, size * 0.4], [-size * 0.31, size * 0.32]], zone.asteroid, zone.ink, 2.5);
  polygon(ctx, [[-size * 0.18, -size * 0.28], [size * 0.19, -size * 0.23], [size * 0.06, size * 0.03], [-size * 0.25, size * 0.08]], zone.asteroidLight, zone.ink, 1.5);
  circle(ctx, size * 0.19, size * 0.17, size * 0.09, zone.crater);
  ctx.restore();
}

function cloud(ctx, colour, width, height, [top, dip, low, rise]) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-30, height * top);
  ctx.bezierCurveTo(width * 0.25, height * (top - 0.13), width * 0.52, height * (top + dip), width + 30, height * (top + 0.03));
  ctx.lineTo(width + 30, height * low);
  ctx.bezierCurveTo(width * 0.65, height * (low + rise), width * 0.35, height * (low - 0.17), -30, height * (low + 0.03));
  ctx.closePath();
  ctx.fill();
}

const ZONES = {
  orbit(ctx, zone, width, height, time) {
    stars(ctx, zone, width, height, time);
    planet(ctx, zone, width * 0.82, height * 0.25, Math.min(width, height) * 0.31, time);
    asteroid(ctx, zone, 24, height * 0.69, 42, time * 0.018 + 0.4);
    asteroid(ctx, zone, width - 26, height * 0.79, 29, -time * 0.015, 1);
  },
  nebula(ctx, zone, width, height, time) {
    ctx.save();
    ctx.translate(Math.sin(time * 0.08) * 3, 0);
    cloud(ctx, zone.cloud, width, height, [0.15, 0.19, 0.52, 0.14]);
    ctx.globalAlpha = 0.55;
    cloud(ctx, zone.cloudLight, width, height, [0.28, 0.19, 0.4, 0.16]);
    ctx.restore();
    stars(ctx, zone, width, height, time);
    planet(ctx, zone, 25, height * 0.76, Math.min(width, height) * 0.2, time);
    planet(ctx, zone, width - 20, height * 0.75, Math.min(width, height) * 0.17, time + 9);
  },
  belt(ctx, zone, width, height, time) {
    stars(ctx, zone, width, height, time);
    for (let at = 0; at < 11; at += 1) {
      const x = ((at / 10) * 1.25 - 0.1) * width;
      const edge = x < width * 0.2 || x > width * 0.8;
      asteroid(ctx, zone, x, height * (0.18 + at * 0.055) + Math.sin(at * 2.1) * 30, (edge ? 40 : 22) + hash(at + 9) * 18, hash(at + 3) * 3 + time * 0.01 * (at % 2 ? 1 : -1), at);
    }
  },
};

export function drawScenery(ctx, { x, y, w, h }, zone, look, time = 0) {
  const colours = look.zones[zone] ?? look.zones.orbit;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = colours.sky;
  ctx.fillRect(x, y, w, h);
  ctx.translate(x, y);
  (ZONES[zone] ?? ZONES.orbit)(ctx, colours, w, h, time);
  ctx.restore();
}
