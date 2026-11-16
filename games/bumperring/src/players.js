import { drawFigure } from "../../../kit/src/avatars/index.js";
import { TAU, clamp, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawUmbrella } from "./effects.js";
import { SQUASH } from "./layout.js";
import { rimmed } from "./rim.js";

export const POSES = Object.freeze(["idle", "back", "charging", "dash", "bumped", "falling", "swim", "cheer"]);

const FIGURES = {
  idle: ["idle", "neutral"], back: ["idle", "happy"], charging: ["block", "determined"], dash: ["run", "determined"],
  bumped: ["lose", "dizzy"], falling: ["jump", "surprised"], swim: ["celebrate", "laughing"], cheer: ["celebrate", "cheering"],
};
// shares of the figure's height
const FEET = 0.48;
const WAIST = 0.13;
const SUNK = 0.2;
const RING = 0.42;
const TUBE = 0.15;
const MARKS = { coral: [0.5, 1.6], aqua: [1.2, 1.2], lilac: [0.25, 0.9], sunny: [2.2, 0.8] };

function half(ctx, x, y, size, look, name, theme, front) {
  const [rx, ry, tube] = [size * RING, size * RING * SQUASH, size * TUBE];
  const [from, to] = front ? [0, Math.PI] : [Math.PI, TAU];
  const [on, off] = MARKS[name] ?? MARKS.coral;
  ctx.save();
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, from, to);
  rimmed(ctx, theme, () => paint(ctx, null, theme.art.ink, tube + 5));
  paint(ctx, null, look.body, tube);
  ctx.setLineDash([tube * on, tube * off]);
  paint(ctx, null, look.stripe, tube * 0.5);
  ctx.setLineDash([]);
  ctx.restore();
}

function ringOf(theme, name) {
  return theme.art.rings[name] ?? theme.art.rings.coral;
}

export function drawRingIcon(ctx, area, name, theme) {
  const size = Math.min(area.w, area.h) * 0.82;
  const [x, y] = [area.x + area.w / 2, area.y + area.h / 2];
  ctx.save();
  half(ctx, x, y, size, ringOf(theme, name), name, theme, false);
  half(ctx, x, y, size, ringOf(theme, name), name, theme, true);
  ctx.restore();
}

function stance(ctx, pose, size, charge, time) {
  if (pose === "charging") ctx.scale(1 + charge * 0.2, 1 - charge * 0.25);
  if (pose === "dash") ctx.scale(1.1, 0.94);
  if (pose === "bumped") ctx.rotate(Math.sin(time * 12) * 0.13);
  if (pose === "falling") {
    ctx.rotate(Math.sin(time * 5) * 0.18);
    ctx.scale(0.88, 0.88);
  }
  if (pose === "swim") ctx.translate(0, Math.sin(time * 3) * size * 0.03);
}

function body(ctx, size, who, pose, time, flip) {
  const [figure, face] = FIGURES[pose];
  const afloat = pose === "swim";
  ctx.save();
  if (afloat) {
    roundedRect(ctx, -size, -size * 1.4, size * 2, size * (1.4 - WAIST), 0);
    ctx.clip();
  }
  drawFigure(ctx, 0, -size * (FEET - (afloat ? SUNK : 0)), size, { ...who, pose: figure, face, time, flip });
  ctx.restore();
}

export function drawPlayer(ctx, x, y, size, who, theme, { ring = "coral", pose = "idle", charge = 0, time = 0, flip = false, place = "pond" } = {}) {
  const look = ringOf(theme, ring);
  const shown = POSES.includes(pose) ? pose : "idle";
  const grounded = shown !== "falling" && shown !== "swim";
  ctx.save();
  if (grounded) {
    ctx.globalAlpha = 0.18;
    ellipse(ctx, x, y, size * 0.34, size * 0.34 * SQUASH, theme.art.effects.shadow);
    ctx.globalAlpha = 1;
  }
  if (shown === "back") ctx.globalAlpha = 0.6;
  ctx.translate(x, y);
  stance(ctx, shown, size, clamp(charge), time);
  if (shown === "falling" && place === "cloud") drawUmbrella(ctx, 0, -size * 1.25, size * 0.9, theme, time);
  half(ctx, 0, -size * WAIST, size, look, ring, theme, false);
  body(ctx, size, who, shown, time, flip);
  half(ctx, 0, -size * WAIST, size, look, ring, theme, true);
  ctx.restore();
}

export function drawArrow(ctx, x, y, size, aim, theme, { mine = true, charge = 0 } = {}) {
  const { arrow, ink } = theme.art;
  const reach = size * (0.86 + 0.4 * clamp(charge));
  const head = size * (mine ? 0.2 : 0.16);
  const colour = mine ? arrow.mine : arrow.theirs;
  ctx.save();
  ctx.translate(x, y - size * WAIST);
  ctx.scale(1, SQUASH);
  ctx.rotate(Math.atan2(aim.y, aim.x));
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    line(ctx, [[size * 0.6, 0], [reach - head * 0.6, 0]], ink, Math.max(3, size * 0.06));
    polygon(ctx, [[reach + head * 0.5, 0], [reach - head * 0.7, -head], [reach - head * 0.7, head]], colour, ink, 3);
  });
  if (!mine) polygon(ctx, [[reach + head * 0.05, 0], [reach - head * 0.45, -head * 0.42], [reach - head * 0.45, head * 0.42]], arrow.tip);
  ctx.restore();
}
