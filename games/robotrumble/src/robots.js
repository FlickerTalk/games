import { drawAvatar } from "../../../kit/src/avatars/index.js";
import { circle, ellipse, line, paint, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";
import { coil, drawDizzyStars, drawGlove, drawShield } from "./parts.js";

export const POSES = Object.freeze(["idle", "walkA", "walkB", "glove", "kick", "shield", "hit", "dizzy", "cheer"]);

const UNIT = 140;
const SCREEN_INSET = 5;
const FACES = { idle: "confident", walkA: "focused", walkB: "focused", glove: "determined", kick: "determined", shield: "focused", hit: "surprised", dizzy: "dizzy", cheer: "laughing" };

const SHAPES = {
  round: { body: [-32, -68, 64, 48, 24], head: [-30, -116, 60, 50, 24], legs: true },
  tall: { body: [-24, -82, 48, 62, 10], head: [-23, -132, 46, 50, 12], legs: true },
  square: { body: [-35, -67, 70, 48, 7], head: [-34, -121, 68, 55, 8], legs: true, band: true },
  wheel: { body: [-31, -74, 62, 47, 18], head: [-27, -119, 54, 47, 18], wheel: true },
  propeller: { body: [-30, -67, 60, 47, 15], head: [-29, -115, 58, 49, 16], legs: true, propeller: true },
  bigHead: { body: [-27, -64, 54, 44, 15], head: [-43, -139, 86, 76, 28], legs: true },
};

export const faceFor = (pose) => FACES[pose] ?? FACES.idle;

function block(ctx, [x, y, width, height, radius], fill, ink) {
  roundedRect(ctx, x, y, width, height, radius);
  paint(ctx, fill, ink, 3);
}

function key(ctx, y, colour, ink) {
  line(ctx, [[-31, y], [-48, y]], ink, 5);
  ellipse(ctx, -53, y - 6, 7, 5, colour, ink, 2.5);
  ellipse(ctx, -53, y + 6, 7, 5, colour, ink, 2.5);
}

function foot(ctx, x, y, colour, art, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  roundedRect(ctx, -12, -9, 31, 14, 6);
  paint(ctx, colour, art.ink, 3);
  line(ctx, [[6, -6], [15, -6]], art.white, 2);
  ctx.restore();
}

function legs(ctx, shape, pose, colours, art) {
  const { ink, metal } = art;
  if (shape.wheel) {
    circle(ctx, 0, -14, 18, metal.tire, ink, 3);
    circle(ctx, 0, -14, 9, metal.hub, ink, 3);
    circle(ctx, 0, -14, 3, ink);
    return;
  }
  const hip = shape.body[1] + shape.body[3] - 2;
  if (pose === "kick") {
    line(ctx, [[-15, hip], [-18, -10]], ink, 10);
    foot(ctx, -23, -5, colours.dark, art);
    line(ctx, [[17, hip], [54, -39], [78, -35]], ink, 11);
    line(ctx, [[22, hip - 5], [50, -38]], metal.hub, 3);
    foot(ctx, 77, -34, colours.dark, art, -0.08);
    return;
  }
  const step = pose === "walkA" ? 10 : pose === "walkB" ? -10 : 0;
  const sit = pose === "dizzy" ? 10 : 0;
  line(ctx, [[-16, hip], [-17 - step, -10 + sit]], ink, 10);
  line(ctx, [[16, hip], [17 + step, -10 + sit]], ink, 10);
  foot(ctx, -22 - step, -5 + sit, colours.dark, art);
  foot(ctx, 12 + step, -5 + sit, colours.dark, art);
}

function springArm(ctx, extension, theme) {
  const { ink, white } = theme.art;
  line(ctx, [[29, -58], [55 + extension, -58]], ink, 9);
  ctx.lineCap = "round";
  coil(ctx, 31, 56 + extension, -58, 5, 4);
  paint(ctx, null, white, 3);
  drawGlove(ctx, 69 + extension, -58, 36, theme);
}

function arm(ctx, side, pose, extension, colours, theme) {
  const { ink } = theme.art;
  const cheer = pose === "cheer";
  const endX = side * (cheer ? 47 : 43);
  const endY = cheer ? -105 : pose === "hit" ? -83 : -52;
  line(ctx, [[side * 27, -59], [endX, endY]], ink, 10);
  line(ctx, [[side * 30, -60], [endX, endY]], colours.light, 4);
  if (side === 1 && pose === "glove") springArm(ctx, extension, theme);
  else drawGlove(ctx, endX, endY, 25, theme, { facing: side, colour: colours.dark });
}

function screen(ctx, [x, y, width, height, radius], pose, theme, { player, facing, time }) {
  const { ink, screen: glass } = theme.art;
  const inner = [x + SCREEN_INSET, y + SCREEN_INSET, width - 2 * SCREEN_INSET, height - 2 * SCREEN_INSET];
  roundedRect(ctx, ...inner, Math.max(4, radius - SCREEN_INSET));
  paint(ctx, glass, ink, 2.5);
  if (!player) return;
  ctx.save();
  roundedRect(ctx, ...inner, Math.max(4, radius - SCREEN_INSET));
  ctx.clip();
  ctx.translate(0, y + height / 2 + 1);
  ctx.scale(facing, 1);
  drawAvatar(ctx, 0, 0, Math.min(inner[2], inner[3]) + 6, { ...player, face: faceFor(pose), time });
  ctx.restore();
}

function propeller(ctx, head, time, art) {
  const top = head[1] - 5;
  line(ctx, [[0, head[1] + 3], [0, top - 9]], art.ink, 4);
  ctx.save();
  ctx.translate(0, top - 10);
  ctx.scale(Math.cos(time * 5), 1);
  ellipse(ctx, -16, 0, 17, 5, art.propeller.blade, art.ink, 2.5);
  ellipse(ctx, 16, 0, 17, 5, art.propeller.blade, art.ink, 2.5);
  ctx.restore();
  circle(ctx, 0, top - 10, 4, art.propeller.knob, art.ink, 3);
}

function antenna(ctx, head, colours, ink) {
  line(ctx, [[0, head[1] + 3], [0, head[1] - 10]], ink, 3);
  circle(ctx, 0, head[1] - 13, 5, colours.light, ink, 3);
}

function parts(ctx, shape, colours, theme, { pose, time, reach, player, facing }) {
  const { art } = theme;
  const extension = pose === "glove" ? (29 + Math.sin(time * 8) * 2) * reach : 0;
  key(ctx, -48, colours.light, art.ink);
  arm(ctx, -1, pose, extension, colours, theme);
  legs(ctx, shape, pose, colours, art);
  block(ctx, shape.body, colours.main, art.ink);
  for (const x of [-14, 0, 14]) circle(ctx, x, -47, 3, colours.light, art.ink, 1.5);
  if (!shape.propeller) antenna(ctx, shape.head, colours, art.ink);
  block(ctx, shape.head, colours.light, art.ink);
  if (shape.band) {
    roundedRect(ctx, -23, shape.head[1] - 3, 46, 7, 3);
    paint(ctx, colours.main, art.ink, 2);
  }
  screen(ctx, shape.head, pose, theme, { player, facing, time });
  arm(ctx, 1, pose, extension, colours, theme);
  if (shape.propeller) propeller(ctx, shape.head, time, art);
  if (pose === "shield") drawShield(ctx, 43, -60, 96, theme, time);
}

function bobOf(pose, time, phase) {
  if (pose === "idle") return Math.sin(time * 3 + phase) * 1.5;
  return pose === "walkA" || pose === "walkB" ? Math.abs(Math.sin(time * 8 + phase)) * -3 : 0;
}

// x, y: between the feet; size: the standing height, antenna and raised arms reach above it
export function drawRobot(ctx, x, y, size, theme, options = {}) {
  const { variant = "round", colour = "sun", facing = 1, pose = "idle", time = 0, phase = 0, reach = 1, player = null } = options;
  const shape = SHAPES[variant] ?? SHAPES.round;
  const colours = theme.art.robots[colour] ?? theme.art.robots.sun;
  ctx.save();
  ctx.translate(x, y + (bobOf(pose, time, phase) * size) / UNIT);
  ctx.scale((facing * size) / UNIT, size / UNIT);
  ctx.lineJoin = "round";
  if (pose === "hit") {
    ctx.translate(7, 1);
    ctx.rotate(0.08);
  }
  if (pose === "dizzy") ctx.translate(0, 12);
  withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, () => parts(ctx, shape, colours, theme, { pose, time, reach, player, facing }));
  ctx.restore();
  if (pose === "dizzy") drawDizzyStars(ctx, x, y - size * 0.9, size * 0.48, theme, time);
}
