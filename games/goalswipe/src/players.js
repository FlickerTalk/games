import { drawFigure } from "../../../kit/src/avatars/index.js";
import { circle, paint, roundedRect } from "../../../kit/src/canvas/pen.js";

// the kit's figure is drawn 190 tall; its hands, from its centre, in the poses a keeper takes
const NOMINAL = 190;
const HANDS = {
  lose: [[-52, 2], [52, 2]],
  jump: [[-31, -59], [31, -59]],
  celebrate: [[-31, -43], [31, -43]],
  block: [[14, -12], [-13, -5]],
};

const SHOOTER = { ready: ["idle", "focused"], kick: ["kick", "determined"], cheer: ["celebrate", "cheering"], miss: ["lose", "oops"] };
const KEEPER = { ready: ["lose", "focused"], dive: ["jump", "determined"], catch: ["block", "happy"], miss: ["lose", "surprised"], cheer: ["celebrate", "cheering"] };

export const KEEPER_POSES = Object.freeze(Object.keys(KEEPER));
export const SHOOTER_POSES = Object.freeze(Object.keys(SHOOTER));

function glove(ctx, x, y, side, { art, stroke }) {
  ctx.save();
  ctx.translate(x, y);
  roundedRect(ctx, -11, -12, 22, 23, 8);
  paint(ctx, art.glove, art.ink, stroke.base);
  circle(ctx, side * 10, -7, 5.5, art.glove, art.ink, stroke.base);
  ctx.restore();
}

export function gloveSpots(pose, time = 0) {
  const lift = pose === "celebrate" ? -Math.abs(Math.sin(time * 6)) * 7 : 0;
  return HANDS[pose].map(([x, y]) => [x, y + lift]);
}

export function drawShooter(ctx, { x, y, size }, player, pose, theme, time) {
  const [figure, face] = SHOOTER[pose] ?? SHOOTER.ready;
  drawFigure(ctx, x, y, size, { ...player, pose: figure, face, time });
}

export function drawKeeper(ctx, { x, y, size }, player, theme, { pose = "ready", lean = 0, spin = 0, time = 0 } = {}) {
  const [figure, face] = KEEPER[pose] ?? KEEPER.ready;
  const still = figure === "jump" ? 0 : time;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean + spin);
  drawFigure(ctx, 0, 0, size, { ...player, pose: figure, face, time: still });
  ctx.scale(size / NOMINAL, size / NOMINAL);
  gloveSpots(figure, still).forEach(([gx, gy], at) => glove(ctx, gx, gy, at ? 1 : -1, theme));
  ctx.restore();
}
