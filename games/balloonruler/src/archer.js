import { FLICK, PROFILES, drawAvatar } from "../../../kit/src/avatars/index.js";
import { TAU, circle, clamp, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

export const POSES = Object.freeze(["idle", "aiming", "release", "cheer", "oops"]);
export const TIPS = Object.freeze(["suction", "cork", "flower"]);

const TALL = 138;
const FEET = 35;
const FACES = Object.freeze({ idle: "happy", aiming: "focused", release: "determined", cheer: "cheering", oops: "surprised" });

const HOLD = Object.freeze({
  idle: { bow: [22, -14], other: [-22, -10], turn: -0.12 },
  aiming: { bow: [28, -30], other: [4, -30], turn: null },
  release: { bow: [28, -30], other: [-14, -34], turn: null },
  cheer: { bow: [26, -62], other: [-26, -74], turn: 0 },
  oops: { bow: [22, -14], other: [-26, -30], turn: -0.12 },
});

export const faceFor = (pose) => FACES[pose] ?? FACES.idle;

const holdOf = (pose) => HOLD[pose] ?? HOLD.idle;

const colourOf = (who) => (who === "flick" ? FLICK.colour : (PROFILES.find((one) => one.id === who) ?? PROFILES[0]).colour);

export function bowAt({ x, y, size, flip = false }) {
  const k = size / TALL;
  const [bowX, bowY] = HOLD.aiming.bow;
  return { x: x + (flip ? -1 : 1) * bowX * k, y: y + (bowY - FEET) * k };
}

function limb(ctx, points, colour, width, ink) {
  line(ctx, points, ink, width + 5);
  line(ctx, points, colour, width);
}

function legs(ctx, colour, ink) {
  for (const side of [-1, 1]) {
    limb(ctx, [[side * 8, -4], [side * 11, 8], [side * 12, 28]], colour, 9, ink);
    ellipse(ctx, side * 13, 30, 8, 4.5, colour, ink, 2.5);
  }
}

function torso(ctx, colour, art) {
  roundedRect(ctx, -20, -46, 40, 44, 14);
  paint(ctx, colour, art.ink, 3);
  ctx.beginPath();
  ctx.arc(0, -22, 6, 0, TAU);
  paint(ctx, null, art.body.belt, 2.5);
}

function bow(ctx, hold, pose, aim, art) {
  ctx.save();
  ctx.translate(hold.bow[0], hold.bow[1]);
  ctx.rotate(hold.turn ?? aim);
  ctx.beginPath();
  ctx.arc(0, 0, 30, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = art.ink;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = art.arrow.bow;
  ctx.lineWidth = 4.5;
  ctx.stroke();
  line(ctx, [[0, -30], [pose === "aiming" ? -12 : 0, 0], [0, 30]], art.arrow.string, 2);
  ctx.restore();
}

function arms(ctx, hold, colour, ink) {
  const [bowX, bowY] = hold.bow;
  const [otherX, otherY] = hold.other;
  limb(ctx, [[16, -40], [(16 + bowX) / 2 + 3, (bowY - 40) / 2 - 2], [bowX, bowY]], colour, 8, ink);
  limb(ctx, [[-16, -40], [(otherX - 16) / 2 - 3, (otherY - 40) / 2 - 2], [otherX, otherY]], colour, 8, ink);
  circle(ctx, bowX, bowY, 5, colour, ink, 2.5);
  circle(ctx, otherX, otherY, 5, colour, ink, 2.5);
}

export function drawArcher(ctx, x, y, size, { player, pose = "idle", time = 0, flip = false, aim = -0.7 }, theme) {
  const { art } = theme;
  const k = size / TALL;
  const colour = colourOf(player?.who);
  const hold = holdOf(pose);
  const hips = y - FEET * k - (pose === "cheer" ? Math.abs(Math.sin(time * 5)) * 3 * k : 0);
  ctx.save();
  ctx.translate(x, hips);
  ctx.scale((flip ? -1 : 1) * k, k);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  legs(ctx, colour, art.ink);
  torso(ctx, colour, art);
  bow(ctx, hold, pose, clamp(aim, -Math.PI, Math.PI), art);
  arms(ctx, hold, colour, art.ink);
  ctx.restore();
  ctx.save();
  ctx.translate(x, hips);
  drawAvatar(ctx, 0, -68 * k, 50 * k, { ...player, face: faceFor(pose), time, flip });
  ctx.restore();
}

export function arrowAt(from, to, progress) {
  const p = clamp(progress);
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const top = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - distance * 0.25 - 20 };
  const q = 1 - p;
  const dx = 2 * q * (top.x - from.x) + 2 * p * (to.x - top.x);
  const dy = 2 * q * (top.y - from.y) + 2 * p * (to.y - top.y);
  return { x: q * q * from.x + 2 * q * p * top.x + p * p * to.x, y: q * q * from.y + 2 * q * p * top.y + p * p * to.y, angle: Math.atan2(dy, dx) };
}

function suction(ctx, art) {
  ctx.beginPath();
  ctx.arc(0, 0, 17, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  paint(ctx, art.arrow.suction, art.ink, 3);
  circle(ctx, -7, 0, 5, art.arrow.suctionDark);
}

function cork(ctx, art) {
  roundedRect(ctx, -15, -10, 30, 20, 8);
  paint(ctx, art.arrow.cork, art.ink, 3);
  line(ctx, [[-8, -7], [-8, 7]], art.arrow.corkLine, 3);
}

function flower(ctx, art) {
  for (let petal = 0; petal < 6; petal += 1) circle(ctx, Math.cos((petal * Math.PI) / 3) * 10, Math.sin((petal * Math.PI) / 3) * 10, 8, art.arrow.petal, art.ink, 2);
  circle(ctx, 0, 0, 8, art.arrow.heart, art.ink, 2);
}

const DRAW = { suction, cork, flower };

export function drawTip(ctx, x, y, size, tip, theme, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size / 48, size / 48);
  (DRAW[tip] ?? suction)(ctx, theme.art);
  ctx.restore();
}

function shaft(ctx, { tip, rival = false }, theme) {
  const { art } = theme;
  line(ctx, [[-42, 0], [-4, 0]], art.ink, 8);
  line(ctx, [[-42, 0], [-4, 0]], art.arrow.shaft, 4.5);
  polygon(ctx, [[-40, 0], [-50, -8], [-47, 0], [-50, 8]], rival ? art.arrow.rivalFeather : art.arrow.feather, art.ink, 2);
  drawTip(ctx, 4, 0, 30, tip, theme);
}

export function drawArrow(ctx, from, to, progress, { tip, scale = 1, rival = false }, theme) {
  const at = arrowAt(from, to, progress);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(at.angle);
  ctx.scale(scale, scale);
  shaft(ctx, { tip, rival }, theme);
  ctx.restore();
}

export function drawPlanted(ctx, x, y, { tip, scale = 1, rival = false }, theme) {
  ctx.save();
  ctx.translate(x, y - 15 * scale);
  ctx.rotate(Math.PI / 2);
  ctx.scale(scale, scale);
  shaft(ctx, { tip, rival }, theme);
  ctx.restore();
}
