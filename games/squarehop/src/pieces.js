import { drawAvatar } from "../../../kit/src/avatars/index.js";
import { circle, ellipse, line, paint, polygon, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";

const FACES = { hop: "happy", bumped: "surprised", laugh: "laughing", wet: "oops", cheer: "cheering" };

export const faceFor = (state, turn) => FACES[state] ?? (turn ? "confident" : "neutral");

function plate(ctx, x, y, size, side, theme) {
  const look = theme.art.sides[side];
  const width = Math.max(2, size * 0.05);
  if (side === 0) circle(ctx, x, y, size * 0.46, look.plate, theme.art.ink, width);
  else {
    roundedRect(ctx, x - size * 0.44, y - size * 0.44, size * 0.88, size * 0.88, size * 0.16);
    paint(ctx, look.plate, theme.art.ink, width);
  }
}

export function drawPiece(ctx, x, y, size, side, player, theme, { face = "neutral", time = 0, lift = 0, wobble = 0 } = {}) {
  const rise = lift * size * 0.45;
  ctx.save();
  ctx.globalAlpha *= 0.25;
  ellipse(ctx, x, y + size * 0.47, size * (0.36 - lift * 0.08), size * 0.07, theme.art.ink);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y - rise);
  ctx.rotate(wobble);
  withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, () => plate(ctx, 0, 0, size, side, theme));
  drawAvatar(ctx, 0, size * 0.03, size * 0.62, { ...player, face, time });
  ctx.restore();
}

export function drawTurnMarker(ctx, x, y, size, side, theme, time) {
  const look = theme.art.sides[side];
  const width = Math.max(2, size * 0.07);
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 5) * size * 0.08);
  withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, () => {
    if (side === 0) {
      ctx.beginPath();
      ctx.moveTo(0, size * 0.42);
      ctx.quadraticCurveTo(-size * 0.48, -size * 0.05, -size * 0.34, -size * 0.3);
      ctx.quadraticCurveTo(0, -size * 0.48, size * 0.34, -size * 0.3);
      ctx.quadraticCurveTo(size * 0.48, -size * 0.05, 0, size * 0.42);
      paint(ctx, look.plate, theme.art.ink, width);
    } else polygon(ctx, [[-size * 0.36, -size * 0.36], [size * 0.36, -size * 0.36], [size * 0.36, size * 0.02], [0, size * 0.42], [-size * 0.36, size * 0.02]], look.plate, theme.art.ink, width);
  });
  circle(ctx, 0, -size * 0.12, size * 0.1, theme.art.white);
  ctx.restore();
}

export function drawSnail(ctx, x, y, size, theme, time) {
  const { shell, swirl, body } = theme.art.snail;
  const { ink } = theme.art;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 3) * size * 0.03);
  withRim(ctx, { ink, colour: theme.art.rim }, () => circle(ctx, 0, 0, size * 0.28, shell, ink, size * 0.045));
  circle(ctx, 0, 0, size * 0.14, swirl, ink, size * 0.035);
  polygon(ctx, [[-size * 0.4, size * 0.24], [size * 0.42, size * 0.24], [size * 0.33, -size * 0.02], [size * 0.12, size * 0.02], [-size * 0.08, size * 0.1], [-size * 0.36, size * 0.08]], body, ink, size * 0.04);
  line(ctx, [[size * 0.26, 0], [size * 0.3, -size * 0.2]], ink, size * 0.035);
  line(ctx, [[size * 0.35, 0], [size * 0.42, -size * 0.18]], ink, size * 0.035);
  circle(ctx, size * 0.3, -size * 0.21, size * 0.035, ink);
  circle(ctx, size * 0.42, -size * 0.19, size * 0.035, ink);
  ctx.restore();
}
