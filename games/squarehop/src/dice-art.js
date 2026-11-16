import { circle, paint, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";

export const PIPS = Object.freeze({
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
});

const FACES_A_SECOND = 3;
const FADED = 0.5;

function halo(ctx, size, theme, time) {
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.65 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
  paint(ctx, theme.art.chosen.halo, theme.art.chosen.ring, Math.max(3, size * 0.04));
}

export function drawDie(ctx, x, y, size, face, look, theme, { state = "ready", time = 0, pressed = false } = {}) {
  const waiting = state === "waiting";
  const rolling = state === "rolling";
  const { ink, rim } = theme.art;
  ctx.save();
  ctx.translate(x, y);
  if (state === "chosen") halo(ctx, size, theme, time);
  if (waiting || state === "unchosen") ctx.globalAlpha = FADED;
  if (rolling) ctx.rotate(Math.sin(time * 18) * 0.14);
  if (waiting) ctx.rotate(Math.sin(time * 2.4) * 0.08);
  if (pressed) ctx.scale(0.93, 0.93);
  withRim(ctx, { ink, colour: rim }, () => {
    roundedRect(ctx, -size / 2, -size / 2, size, size, size * 0.22);
    paint(ctx, look.face, ink, Math.max(2.5, size * 0.045));
  });
  const shown = rolling ? 1 + ((face + Math.floor(time * FACES_A_SECOND)) % 6) : face;
  if (!waiting) for (const [px, py] of PIPS[shown] ?? []) circle(ctx, px * size * 0.23, py * size * 0.23, size * 0.075, look.pip);
  ctx.restore();
}
