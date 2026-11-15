import { FLICK, PROFILES, colourOf, hairOf, profileOf } from "./cast.js";
import { drawEmblem } from "./emblems.js";
import { drawExpression } from "./expressions.js";
import { drawHairBack, drawHairFront } from "./hair.js";
import { INK, circle, line, paint, roundedRect } from "./pen.js";

const FLICK_LIGHT = "#B8ACF5";
const SCREEN = "#263858";

export const finite = (value) => (Number.isFinite(value) ? value : 0);

export const given = (options) => (options && typeof options === "object" ? options : {});

function facePath(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.bezierCurveTo(24, -42, 41, -26, 42, -2);
  ctx.bezierCurveTo(43, 23, 25, 41, 0, 42);
  ctx.bezierCurveTo(-25, 41, -43, 23, -42, -2);
  ctx.bezierCurveTo(-41, -26, -24, -42, 0, -42);
  ctx.closePath();
}

// below 64 px the emblem grows and moves in, so it still reads at 32 px
function emblemOn(ctx, emblem, pixels) {
  const grow = Math.min(1, Math.max(0, (64 - pixels) / 32));
  const scale = 0.72 + 0.24 * grow;
  ctx.save();
  ctx.translate(23 - 3 * grow, 25 - 3 * grow);
  ctx.scale(scale, scale);
  drawEmblem(ctx, emblem);
  ctx.restore();
}

function flick(ctx, face, time, pixels) {
  const sway = Math.sin(time * 2.4) * 1.5;
  line(ctx, [[0, -39], [sway, -51]], INK, 3.2);
  circle(ctx, sway, -54, 5, FLICK_LIGHT, INK, 2.8);
  for (const side of [-1, 1]) {
    roundedRect(ctx, side * 40 - 5, -12, 10, 23, 4);
    paint(ctx, FLICK_LIGHT, INK, 3);
  }
  facePath(ctx);
  paint(ctx, FLICK.colour, INK, 3.6);
  roundedRect(ctx, -30, -27, 60, 48, 14);
  paint(ctx, SCREEN, INK, 3);
  drawExpression(ctx, face, { time, phase: 12 * 0.29, robot: true });
  emblemOn(ctx, FLICK.emblem, pixels);
}

export function paintAvatar(ctx, options, pixels) {
  const { who, hair, hairColour, face } = options;
  const time = finite(options.time);
  const profile = profileOf(who);
  const index = profile === FLICK ? PROFILES.length : PROFILES.indexOf(profile);
  ctx.translate(0, Math.sin(time * 2.15 + index * 0.23) * 0.75);
  if (profile === FLICK) return flick(ctx, face, time, pixels);
  const colour = colourOf(hairColour).colour;
  const style = hairOf(hair).id;
  const swing = { time, motion: finite(options.motion) };
  drawHairBack(ctx, style, colour, swing);
  facePath(ctx);
  paint(ctx, profile.colour, INK, 3.6);
  emblemOn(ctx, profile.emblem, pixels);
  drawExpression(ctx, face, { time, phase: index * 0.29 });
  drawHairFront(ctx, style, colour, swing);
}

export function drawAvatar(ctx, x, y, size, options) {
  if (!(size > 0 && Number.isFinite(size))) return;
  const chosen = given(options);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(chosen.flip ? -size / 100 : size / 100, size / 100);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  paintAvatar(ctx, chosen, size);
  ctx.restore();
}
