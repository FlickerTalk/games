import { drawFigure } from "../../../kit/src/avatars/index.js";
import { TAU, clamp, ease, ellipse, line, mix, paint, polygon, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";
import { BALLOON_LIFT } from "./layout.js";

export const POSES = Object.freeze(["wait", "ready", "windup", "strike", "stumble", "laugh"]);

// the kit's figure is drawn on a 190-unit grid, its centre 100 units over the feet
const GRID = 190;
const FEET = 100;
const HEAD_TOP = -92;
const SWORD = 0.5;
const BALLOON = 0.34;

const BODY = { wait: "idle", ready: "block", windup: "lose", strike: "lose", stumble: "run", laugh: "lose" };
const FACE = { wait: "confident", ready: "focused", windup: "determined", strike: "determined", stumble: "dizzy" };

// where the hand holds the sword on the figure's grid, and how far the blade leans towards the other knight
function holdOf(pose, progress) {
  if (pose === "ready") return { x: 14, y: -12, angle: 0.6 };
  if (pose === "windup") return { x: 52, y: 2, angle: 0 };
  if (pose === "strike") return { x: 52, y: 2, angle: mix(0, 1.3, ease(progress)) };
  if (pose === "laugh") return { x: 52, y: 2, angle: 2.2 };
  return { x: 30, y: 43, angle: 0.55 };
}

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);

function bladePath(ctx, shape, length, width) {
  ctx.beginPath();
  if (shape === "curved") {
    ctx.moveTo(-width * 0.34, -length * 0.05);
    ctx.quadraticCurveTo(-width * 0.6, -length * 0.55, width * 0.28, -length * 0.9);
    ctx.quadraticCurveTo(width * 0.65, -length * 0.72, width * 0.35, -length * 0.05);
    ctx.closePath();
    return;
  }
  if (shape === "wavy") {
    ctx.moveTo(-width * 0.4, -length * 0.05);
    ctx.quadraticCurveTo(-width * 0.8, -length * 0.35, -width * 0.25, -length * 0.5);
    ctx.quadraticCurveTo(width * 0.4, -length * 0.7, 0, -length * 0.94);
    ctx.quadraticCurveTo(width * 0.75, -length * 0.65, width * 0.3, -length * 0.45);
    ctx.quadraticCurveTo(-width * 0.25, -length * 0.25, width * 0.4, -length * 0.05);
    ctx.closePath();
    return;
  }
  const wide = width * (shape === "block" ? 0.95 : shape === "paddle" ? 1.15 : 0.8);
  const top = length * (shape === "long" ? 0.98 : 0.88);
  roundedRect(ctx, -wide / 2, -top, wide, top, wide * (shape === "block" ? 0.18 : 0.48));
}

export function drawSword(ctx, x, y, length, shape, angle, theme) {
  const { foam, ink } = theme.art;
  const width = length * 0.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineJoin = "round";
  roundedRect(ctx, -width * 0.18, -length * 0.02, width * 0.36, length * 0.25, width * 0.12);
  paint(ctx, foam.grip, ink, Math.max(1.5, length * 0.035));
  roundedRect(ctx, -width * 0.72, -length * 0.06, width * 1.44, length * 0.09, width * 0.18);
  paint(ctx, foam.guard, ink, Math.max(1.5, length * 0.035));
  bladePath(ctx, shape, length, width);
  paint(ctx, foam.blades[shape] ?? foam.blades.broad, ink, Math.max(2, length * 0.04));
  line(ctx, [[-width * 0.15, -length * 0.73], [width * 0.12, -length * 0.76]], foam.shine, Math.max(1.5, length * 0.035));
  ctx.restore();
}

export function drawHelmetBalloon(ctx, x, y, size, side, theme, { time = 0, grown = 1 } = {}) {
  const { balloons, ink } = theme.art;
  const scale = ease(clamp(grown));
  if (scale <= 0) return;
  ctx.save();
  ctx.translate(x, y + size * 0.6);
  ctx.scale(scale, scale);
  ctx.translate(0, -size * 0.6 + Math.sin(time * 2.8) * size * 0.035);
  ctx.rotate(Math.sin(time * 1.9 + 1.2) * 0.035);
  ctx.beginPath();
  if (side === "theirs") roundedRect(ctx, -size * 0.4, -size * 0.52, size * 0.8, size * 0.96, size * 0.3);
  else ctx.ellipse(0, -size * 0.04, size * 0.4, size * 0.5, 0, 0, TAU);
  paint(ctx, balloons[side] ?? balloons.mine, ink, Math.max(2, size * 0.065));
  polygon(ctx, [[-size * 0.1, size * 0.42], [size * 0.1, size * 0.42], [0, size * 0.6]], balloons.knot, ink, Math.max(1.5, size * 0.045));
  ellipse(ctx, -size * 0.13, -size * 0.22, size * 0.09, size * 0.15, balloons.shine);
  ctx.restore();
}

function tilt(pose, progress) {
  if (pose === "stumble") return Math.sin(clamp(progress) * Math.PI) * 0.5;
  if (pose === "laugh") return -Math.sin(clamp(progress) * Math.PI) * 0.12;
  return 0;
}

const laughing = (progress) => (progress < 0.25 ? "surprised" : "laughing");

function balloonOn(ctx, knight, theme, time) {
  const { balloons } = theme.art;
  const y = FEET - BALLOON_LIFT * GRID;
  const size = BALLOON * GRID;
  line(ctx, [[0, HEAD_TOP + 6], [0, y + size * 0.6]], balloons.string, 2.5);
  roundedRect(ctx, -16, HEAD_TOP - 1, 32, 9, 4);
  paint(ctx, balloons.band, theme.art.ink, 3);
  drawHelmetBalloon(ctx, 0, y, size, knight.side, theme, { time, grown: knight.balloon });
}

const HOP = 30;

function placed(ctx, x, ground, size, knight, theme) {
  const k = size / GRID;
  const stumbling = knight.pose === "stumble";
  ctx.translate(x, ground);
  ctx.scale(knight.flip ? -k : k, k);
  if (stumbling) drawSword(ctx, 58, -8, SWORD * GRID, knight.sword, 1.45, theme);
  ctx.rotate(tilt(knight.pose, knight.progress));
  ctx.translate(0, -FEET - (stumbling ? Math.sin(clamp(knight.progress) * Math.PI) * HOP : 0));
}

// knight: { player, pose, progress, flip, sword, side, balloon } with balloon from 0 (none) to 1 (blown up)
export function drawKnight(ctx, x, ground, size, knight, theme, time) {
  const { pose, progress = 0 } = knight;
  const hold = holdOf(pose, progress);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  rimmed(ctx, theme, () => {
    placed(ctx, x, ground, size, knight, theme);
    drawFigure(ctx, 0, 0, GRID, { ...knight.player, pose: BODY[pose] ?? "idle", face: pose === "laugh" ? laughing(progress) : FACE[pose], time });
    if (pose !== "stumble") drawSword(ctx, hold.x, hold.y, SWORD * GRID, knight.sword, hold.angle, theme);
    if (knight.balloon > 0) balloonOn(ctx, knight, theme, time);
  });
  ctx.restore();
}

export function tipOf(x, ground, size, knight) {
  const k = size / GRID;
  const hold = holdOf(knight.pose, knight.progress ?? 0);
  const reach = SWORD * GRID * 0.9;
  const side = knight.flip ? -1 : 1;
  return { x: x + side * k * (hold.x + Math.sin(hold.angle) * reach), y: ground + k * (hold.y - FEET - Math.cos(hold.angle) * reach) };
}
