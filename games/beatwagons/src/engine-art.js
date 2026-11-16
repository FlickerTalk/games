import { drawAvatar } from "../../../kit/src/avatars/index.js";
import { circle, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawWheel } from "./wagon-art.js";

export const ENGINES = Object.freeze(["steam", "rocket", "caterpillar", "teapot", "whale", "dragon"]);
export const POSES = Object.freeze(["idle", "puffing", "dancing"]);

const WINDOWS = { steam: [-9, -6, 17], rocket: [7, -12, 17], caterpillar: [23, -9, 17], teapot: [-3, -8, 19], whale: [6, -12, 17], dragon: [21, -16, 18] };
const FUNNELS = { steam: [-29, -47], rocket: [-48, -8], caterpillar: [-30, -32], teapot: [-52, -22], whale: [-9, -50], dragon: [-30, -44] };
const FACES = { idle: "happy", puffing: "focused", dancing: "cheering" };

function chassis(ctx, fill, art) {
  roundedRect(ctx, -48, 10, 94, 18, 8);
  paint(ctx, fill, art.ink, 3);
  line(ctx, [[42, 18], [52, 18]], art.ink, 4);
  drawWheel(ctx, -29, 30, 11, art);
  drawWheel(ctx, 27, 30, 11, art);
}

const BODIES = {
  steam(ctx, look, art) {
    roundedRect(ctx, -38, -25, 65, 39, 17);
    paint(ctx, look.body, art.ink, 3);
    roundedRect(ctx, 10, -43, 31, 56, 7);
    paint(ctx, look.cab, art.ink, 3);
    roundedRect(ctx, 16, -35, 18, 18, 5);
    paint(ctx, art.glass, art.ink, 3);
    roundedRect(ctx, -35, -43, 13, 24, 4);
    paint(ctx, look.trim, art.ink, 3);
    roundedRect(ctx, -40, -47, 23, 7, 3);
    paint(ctx, look.trim, art.ink, 3);
  },
  rocket(ctx, look, art) {
    polygon(ctx, [[-46, 8], [-46, -19], [-15, -38], [30, -27], [48, -5], [30, 12]], look.body, art.ink, 3);
    polygon(ctx, [[-43, -18], [-54, -35], [-25, -29]], look.cab, art.ink, 3);
    polygon(ctx, [[-39, 7], [-49, 25], [-20, 11]], look.cab, art.ink, 3);
    line(ctx, [[31, -24], [42, -9]], look.trim, 4);
  },
  caterpillar(ctx, look, art, time) {
    for (let part = 0; part < 3; part += 1) ellipse(ctx, -30 + part * 26, -7 - Math.sin(time * 4 + part) * 2, 20, 23, part === 2 ? look.cab : look.body, art.ink, 3);
    line(ctx, [[19, -29], [16, -42]], art.ink, 3);
    line(ctx, [[31, -30], [36, -42]], art.ink, 3);
    circle(ctx, 16, -43, 4, look.trim, art.ink, 3);
    circle(ctx, 37, -43, 4, look.trim, art.ink, 3);
  },
  teapot(ctx, look, art) {
    ctx.beginPath();
    ctx.moveTo(-31, -17);
    ctx.quadraticCurveTo(-57, -25, -51, -2);
    ctx.quadraticCurveTo(-45, 7, -35, 2);
    paint(ctx, look.body, art.ink, 3);
    ctx.beginPath();
    ctx.arc(31, -8, 22, -Math.PI / 2, Math.PI / 2);
    ctx.arc(31, -8, 12, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    paint(ctx, look.body, art.ink, 3);
    ellipse(ctx, 0, -7, 37, 29, look.body, art.ink, 3);
    roundedRect(ctx, -21, -40, 41, 8, 4);
    paint(ctx, look.cab, art.ink, 3);
    circle(ctx, 0, -43, 5, look.cab, art.ink, 3);
  },
  whale(ctx, look, art, time) {
    ctx.beginPath();
    ctx.moveTo(-45, 7);
    ctx.quadraticCurveTo(-45, -34, 6, -35);
    ctx.quadraticCurveTo(37, -34, 42, -9);
    ctx.quadraticCurveTo(48, -18, 53, -23);
    ctx.quadraticCurveTo(55, -7, 43, 5);
    ctx.quadraticCurveTo(10, 23, -45, 7);
    ctx.closePath();
    paint(ctx, look.body, art.ink, 3);
    line(ctx, [[-9, -35], [-9, -45 - Math.sin(time * 4) * 2]], look.trim, 5);
    ellipse(ctx, -14, -48, 5, 3, look.trim);
    ellipse(ctx, -3, -50, 5, 3, look.trim);
  },
  dragon(ctx, look, art, time) {
    ellipse(ctx, -5, -6, 39, 27, look.body, art.ink, 3);
    polygon(ctx, [[-37, -20], [-45, -43], [-22, -30]], look.cab, art.ink, 3);
    polygon(ctx, [[-12, -31], [-5, -50], [5, -31]], look.cab, art.ink, 3);
    ellipse(ctx, 23, -15, 24, 23, look.body, art.ink, 3);
    ellipse(ctx, 40, -3, 12, 9, look.cheek, art.ink, 2);
    circle(ctx, 45, -5, 2, art.ink);
    const wing = 4 + Math.sin(time * 5) * 3;
    polygon(ctx, [[-20, -22], [-35, -44 - wing], [-4, -32]], look.trim, art.ink, 3);
  },
};

function pilotWindow(ctx, [x, y, radius], pilot, look, art, pose, time) {
  circle(ctx, x, y, radius, pilot ? art.glass : look.cheek, art.ink, 3);
  if (!pilot) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.9, 0, Math.PI * 2);
  ctx.clip();
  drawAvatar(ctx, x, y + radius * 0.14, radius * 2.1, { ...pilot, face: FACES[pose] ?? "happy", time });
  ctx.restore();
}

function puffs(ctx, [x, y], art, time) {
  const drift = (time * 18) % 14;
  ellipse(ctx, x - drift * 0.4, y - 8 - drift, 8 + drift * 0.25, 7 + drift * 0.2, art.puff, art.ink, 2);
  ellipse(ctx, x - 8 - drift * 0.5, y - 22 - drift, 6, 5, art.puff, art.ink, 2);
}

export function drawEngine(ctx, x, y, size, kind, { pose = "idle", time = 0, pilot = null } = {}, theme) {
  const { art } = theme;
  const name = ENGINES.includes(kind) ? kind : "steam";
  const look = art.engines[name];
  const dancing = pose === "dancing";
  ctx.save();
  ctx.translate(x, y - (dancing ? Math.abs(Math.sin(time * 6)) * size * 0.06 : 0));
  ctx.rotate(dancing ? Math.sin(time * 6) * 0.055 : 0);
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  chassis(ctx, look.body, art);
  BODIES[name](ctx, look, art, time);
  pilotWindow(ctx, WINDOWS[name], pilot, look, art, pose, time);
  if (pose === "puffing") puffs(ctx, FUNNELS[name], art, time);
  ctx.restore();
}
