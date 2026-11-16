import { FLICK, PROFILES, drawAvatar } from "../../../kit/src/avatars/index.js";
import { circle, ellipse, line, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

export const POSES = Object.freeze(["idle", "lowering", "pulling", "cheering", "laughing"]);

const FACES = Object.freeze({ idle: "happy", lowering: "neutral", pulling: "confident", cheering: "cheering", laughing: "laughing" });

const HOLD = Object.freeze({
  idle: { near: [20, -18], far: [6, -16], tip: [52, -92], butt: [-2, -8] },
  lowering: { near: [22, -16], far: [8, -14], tip: [56, -82], butt: [-2, -6] },
  pulling: { near: [18, -30], far: [4, -26], tip: [40, -100], butt: [-4, -16] },
  cheering: { near: [24, -78], far: [-24, -78], tip: [44, -104], butt: [18, -66] },
  laughing: { near: [20, -18], far: [6, -16], tip: [52, -90], butt: [-2, -8] },
});

export const faceFor = (pose) => FACES[pose] ?? FACES.idle;

const holdOf = (pose) => HOLD[pose] ?? HOLD.idle;

export function rodTip(x, y, size, { flip = false, pose = "idle" } = {}) {
  const [tipX, tipY] = holdOf(pose).tip;
  return { x: x + ((flip ? -1 : 1) * tipX * size) / 100, y: y + (tipY * size) / 100 };
}

const colourOf = (who) => (who === "flick" ? FLICK.colour : (PROFILES.find((one) => one.id === who) ?? PROFILES[0]).colour);

function limb(ctx, points, colour, width, ink) {
  line(ctx, points, ink, width + 5);
  line(ctx, points, colour, width);
}

function legs(ctx, colour, ink, time) {
  for (const side of [-1, 1]) {
    const swing = Math.sin(time * 1.6 + side) * 2;
    limb(ctx, [[side * 8, -4], [side * 11, 6], [side * 12 + swing, 28]], colour, 9, ink);
    ellipse(ctx, side * 13 + swing, 31, 8, 4.5, colour, ink, 2.5);
  }
}

function torso(ctx, colour, art) {
  roundedRect(ctx, -20, -46, 40, 44, 14);
  paint(ctx, colour, art.ink, 3);
  ctx.beginPath();
  ctx.arc(0, -22, 6, 0, Math.PI * 2);
  paint(ctx, null, art.body.belt, 2.5);
}

function rod(ctx, hold, art) {
  line(ctx, [hold.butt, hold.tip], art.ink, 5);
  line(ctx, [hold.butt, hold.tip], art.body.rod, 2.5);
  circle(ctx, hold.butt[0] + (hold.tip[0] - hold.butt[0]) * 0.12, hold.butt[1] + (hold.tip[1] - hold.butt[1]) * 0.12, 4.5, art.hook.metal, art.ink, 2);
}

function arms(ctx, hold, colour, ink) {
  const [nearX, nearY] = hold.near;
  const [farX, farY] = hold.far;
  limb(ctx, [[16, -40], [Math.max(nearX, 22), (nearY - 40) / 2], [nearX, nearY]], colour, 8, ink);
  limb(ctx, [[-16, -40], [Math.min(farX, -12), (farY - 40) / 2], [farX, farY]], colour, 8, ink);
  circle(ctx, nearX, nearY, 5, colour, ink, 2.5);
  circle(ctx, farX, farY, 5, colour, ink, 2.5);
}

export function drawAngler(ctx, x, y, size, { player, pose = "idle", time = 0, flip = false }, theme) {
  const { art } = theme;
  const colour = colourOf(player?.who);
  const hold = holdOf(pose);
  const lift = pose === "cheering" ? (-Math.abs(Math.sin(time * 5)) * 3 * size) / 100 : 0;
  ctx.save();
  ctx.translate(x, y + lift);
  ctx.scale(((flip ? -1 : 1) * size) / 100, size / 100);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (pose === "laughing") ctx.rotate(Math.sin(time * 8) * 0.03);
  legs(ctx, colour, art.ink, time);
  torso(ctx, colour, art);
  rod(ctx, hold, art);
  arms(ctx, hold, colour, art.ink);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y + lift);
  drawAvatar(ctx, 0, (-68 * size) / 100, size * 0.5, { ...player, face: faceFor(pose), time, flip });
  ctx.restore();
}
