import { ellipse, hash, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { WORLD, floorY, groundY, hasGround, islandsOf, seaOf } from "./world.js";

const H = WORLD.height;
const W = WORLD.width;
const STEP = 12;

export const waveAt = (x, time) => Math.sin((x / W) * Math.PI * 4 + time * 1.15) * 3 + Math.sin((x / W) * Math.PI * 6.8 - time * 0.8) * 1.5;

function cloud(ctx, x, y, size, time, colour) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 0.7 + x) * size * 0.025);
  ellipse(ctx, -size * 0.22, 0, size * 0.25, size * 0.18, colour);
  ellipse(ctx, 0, -size * 0.09, size * 0.31, size * 0.25, colour);
  ellipse(ctx, size * 0.27, 0, size * 0.25, size * 0.17, colour);
  roundedRect(ctx, -size * 0.43, -size * 0.01, size * 0.86, size * 0.18, size * 0.08);
  paint(ctx, colour);
  ctx.restore();
}

function sky(ctx, world, colours, { left, right, time, wind }) {
  if (world.field !== "deep") {
    ctx.beginPath();
    ctx.moveTo(left, H * 0.7);
    for (let x = left; x <= right + STEP; x += STEP * 2) ctx.lineTo(x, H * (0.48 + Math.sin((x / W) * Math.PI * 3) * 0.055));
    ctx.lineTo(right, H * 0.7);
    ctx.closePath();
    paint(ctx, colours.distant);
  }
  const span = right - left + 150;
  const count = Math.max(world.field === "deep" ? 2 : 4, Math.round(span / 140));
  for (let at = 0; at < count; at += 1) {
    const x = left - 60 + ((((at * span) / count + time * wind * 9) % span) + span) % span;
    cloud(ctx, x, H * (0.08 + (at % 2) * 0.08), 55 + (at % 4) * 7, time + at, colours.cloud);
  }
}

function tree(ctx, x, y, size, snowy, art) {
  roundedRect(ctx, x - size * 0.06, y - size * 0.35, size * 0.12, size * 0.4, size * 0.03);
  paint(ctx, art.trunk, art.ink, size * 0.025);
  const [low, high] = snowy ? [art.pine, art.pineLight] : [art.tree, art.treeLight];
  polygon(ctx, [[x, y - size], [x - size * 0.34, y - size * 0.36], [x + size * 0.34, y - size * 0.36]], low, art.ink, size * 0.025);
  polygon(ctx, [[x, y - size * 0.8], [x - size * 0.4, y - size * 0.15], [x + size * 0.4, y - size * 0.15]], high, art.ink, size * 0.025);
  if (snowy) line(ctx, [[x - size * 0.24, y - size * 0.34], [x + size * 0.18, y - size * 0.34]], art.snow, size * 0.07);
}

function cactus(ctx, x, y, size, art) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - size * 0.75);
  ctx.moveTo(x, y - size * 0.36);
  ctx.lineTo(x - size * 0.25, y - size * 0.48);
  ctx.lineTo(x - size * 0.25, y - size * 0.6);
  for (const [colour, width] of [[art.ink, 0.19], [art.cactus, 0.12]]) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = size * width;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function decorations(ctx, world, scenery, art) {
  const spots = world.field === "coast" ? [0.06, 0.17, 0.29, 0.4] : [0.08, 0.3, 0.7, 0.91];
  spots.forEach((at, index) => {
    const x = W * at;
    const size = 30 + hash(index + 7) * 15;
    const y = groundY(world, x) + 3;
    if (scenery === "desert") cactus(ctx, x, y, size, art);
    else tree(ctx, x, y, size, scenery === "snow", art);
  });
}

function water(ctx, world, colours, { left, right, bottom, time }) {
  const sea = seaOf(world.field);
  const from = world.field === "coast" ? Math.max(left, W * 0.4) : left;
  ctx.save();
  ctx.fillStyle = colours.water;
  ctx.fillRect(from, sea, right - from, bottom - sea);
  ctx.globalAlpha *= 0.24;
  ctx.fillStyle = colours.waterDark;
  ctx.fillRect(from, sea + (bottom - sea) * 0.62, right - from, bottom - sea);
  ctx.restore();
  for (let row = 0; row < 3; row += 1) {
    const points = [];
    for (let x = from - STEP; x <= right + STEP; x += STEP) points.push([x, sea + row * 19 + waveAt(x + row * 17, time + row * 0.6)]);
    line(ctx, points, row === 0 ? colours.cloud : colours.waterLight, row === 0 ? 4 : 3);
  }
}

function island(ctx, { x, y, size }, scenery, art) {
  const width = Math.max(2, size * 0.035);
  if (scenery === "snow") {
    polygon(ctx, [[x - size * 0.55, y + size * 0.1], [x - size * 0.38, y - size * 0.18], [x - size * 0.12, y - size * 0.48], [x + size * 0.08, y - size * 0.27], [x + size * 0.34, y - size * 0.38], [x + size * 0.53, y + size * 0.1]], art.ice, art.ink, width);
    polygon(ctx, [[x - size * 0.13, y - size * 0.43], [x - size * 0.02, y - size * 0.26], [x + size * 0.08, y - size * 0.29]], art.white);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x - size * 0.58, y + size * 0.12);
  ctx.quadraticCurveTo(x - size * 0.3, y - size * 0.5, x, y - size * 0.36);
  ctx.quadraticCurveTo(x + size * 0.38, y - size * 0.48, x + size * 0.58, y + size * 0.12);
  ctx.closePath();
  paint(ctx, art.rock, art.ink, width);
  ellipse(ctx, x - size * 0.12, y - size * 0.3, size * 0.24, size * 0.12, scenery === "desert" ? art.desert : art.meadow);
  ellipse(ctx, x + size * 0.23, y - size * 0.12, size * 0.12, size * 0.1, art.rock, art.ink, size * 0.025);
}

function islands(ctx, world, scenery, colours, art) {
  for (const one of islandsOf(world.field)) {
    island(ctx, one, scenery, art);
    for (const crater of world.craters.filter((bite) => Math.abs(bite.x - one.x) < one.size)) {
      ellipse(ctx, crater.x, crater.y, crater.r, crater.r * 0.65, colours.water);
      ctx.beginPath();
      ctx.arc(crater.x, crater.y, crater.r, Math.PI, Math.PI * 2);
      ctx.strokeStyle = colours.waterLight;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

function seaweed(ctx, x, y, size, time, colours) {
  for (let blade = -1; blade <= 1; blade += 1) {
    const sway = Math.sin(time * 0.65 + blade + x * 0.01) * size * 0.16;
    ctx.beginPath();
    ctx.moveTo(x + blade * size * 0.18, y);
    ctx.quadraticCurveTo(x + blade * size * 0.16 - sway, y - size * 0.48, x + blade * size * 0.2 + sway, y - size * (0.82 + (blade + 1) * 0.1));
    ctx.strokeStyle = colours[blade === 0 ? 1 : 0];
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

function reef(ctx, x, y, size, art) {
  for (const side of [-1, 1]) {
    line(ctx, [[x, y], [x + side * size * 0.18, y - size * 0.42], [x + side * size * 0.36, y - size * 0.6]], art.reef, size * 0.16);
    line(ctx, [[x + side * size * 0.16, y - size * 0.36], [x + side * size * 0.05, y - size * 0.62]], art.reefLight, size * 0.12);
  }
  ellipse(ctx, x, y, size * 0.36, size * 0.13, art.rock, art.ink, 2);
}

function deepFloor(ctx, scenery, colours, art, { left, right, bottom, time }) {
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  for (let x = left; x <= right + STEP; x += STEP) ctx.lineTo(x, floorY(x));
  ctx.lineTo(right, bottom);
  ctx.closePath();
  paint(ctx, colours.floor);
  const ridge = [];
  for (let x = left; x <= right + STEP; x += STEP * 2) ridge.push([x, floorY(x) + Math.sin(x * 0.03) * 3]);
  line(ctx, ridge, colours.floorDark, 4);
  const weeds = scenery === "snow" ? [art.pine, art.pineLight] : [art.kelp, art.kelpLight];
  const plants = scenery === "desert" ? [0.08, 0.18, 0.34, 0.63, 0.77, 0.91] : [0.1, 0.38, 0.72, 0.9];
  plants.forEach((at, index) => seaweed(ctx, W * at, floorY(W * at) + 14, 46 + (index % 2) * 15, time + index, weeds));
  for (const [at, depth, scale] of [[0.24, 0.94, 0.07], [0.55, 0.96, 0.09], [0.84, 0.93, 0.055]]) {
    ellipse(ctx, W * at, H * depth, W * scale, W * scale * 0.4, scenery === "snow" ? art.iceDark : art.rock, art.ink, 2.5);
  }
  if (scenery === "meadow") reef(ctx, W * 0.58, floorY(W * 0.58) + 20, 76, art);
  if (scenery === "snow") polygon(ctx, [[W * 0.4, floorY(W * 0.4)], [W * 0.46, floorY(W * 0.46) - 34], [W * 0.52, floorY(W * 0.52)]], art.ice, art.ink, 3);
}

function land(ctx, world, scenery, colours, { left, right, bottom }) {
  const end = world.field === "coast" ? Math.min(right, W * 0.48) : right;
  const xs = [];
  for (let x = left; x < end; x += STEP / 2) xs.push(x);
  xs.push(end);
  for (const crater of world.craters) for (let step = -4; step <= 4; step += 1) xs.push(crater.x + (crater.r * step) / 4);
  const points = xs.filter((x) => x >= left && x <= end && hasGround(world.field, x - 0.001)).sort((a, b) => a - b).map((x) => [x, groundY(world, x - 0.001)]);
  ctx.beginPath();
  points.forEach(([x, y], at) => (at ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineTo(end, bottom);
  ctx.lineTo(left, bottom);
  ctx.closePath();
  paint(ctx, colours.ground);
  line(ctx, points, colours.groundDark, scenery === "snow" ? 7 : 5);
  if (scenery !== "desert") return;
  for (let dune = 1; dune < 5; dune += 1) {
    const y = H * (0.82 + dune * 0.032);
    line(ctx, [[left + (end - left) * 0.05 * dune, y], [Math.min(end, left + (end - left) * (0.18 + dune * 0.07)), y - 4]], colours.groundDark, 2);
  }
}

export function drawScene(ctx, world, view, art) {
  const colours = art.scenery[view.scenery] ?? art.scenery.meadow;
  ctx.save();
  sky(ctx, world, colours, view);
  if (hasGround(world.field, 0)) decorations(ctx, world, view.scenery, art);
  if (world.field !== "land") water(ctx, world, colours, view);
  if (world.field === "deep") deepFloor(ctx, view.scenery, colours, art, view);
  else if (world.field === "sea") islands(ctx, world, view.scenery, colours, art);
  else land(ctx, world, view.scenery, colours, view);
  ctx.restore();
}
