import { drawFigure } from "../../../kit/src/avatars/index.js";
import { ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

const LENGTH = 110;
const HAND = { x: 0.16, y: 0.23 };

function head(ctx, look, mallet, ink) {
  if (look === "round") {
    ellipse(ctx, 0, -45, 40, 24, mallet.light, ink, 4);
    ellipse(ctx, 0, -45, 23, 12, mallet.wood);
    return;
  }
  if (look === "wedge") {
    polygon(ctx, [[-39, -63], [30, -63], [42, -44], [29, -25], [-39, -25]], mallet.light, ink, 4);
    line(ctx, [[-19, -57], [-19, -31]], mallet.wood, 4);
    return;
  }
  roundedRect(ctx, -39, -64, 78, 42, 12);
  paint(ctx, mallet.light, ink, 4);
  line(ctx, [[-18, -58], [-18, -28]], mallet.wood, 4);
}

export function drawMallet(ctx, x, y, length, { look = "block", angle = 0 }, theme) {
  const { mallet, ink } = theme.art;
  const scale = length / LENGTH;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.translate(0, -38);
  roundedRect(ctx, -6, -40, 12, 91, 6);
  paint(ctx, mallet.light, ink, 4);
  line(ctx, [[0, -28], [0, 35]], mallet.wood, 3);
  head(ctx, look, mallet, ink);
  ctx.restore();
}

export function drawHero(ctx, { x, y, size }, { player, mallet = "block", angle = 0, pose = "idle", flip = false, time = 0 }, theme) {
  const side = flip ? -1 : 1;
  const raised = pose === "celebrate";
  const hand = raised ? { x: 0.16, y: -0.25 } : pose === "lose" ? { x: 0.27, y: 0.01 } : HAND;
  ctx.save();
  ellipse(ctx, x, y + size * 0.5, size * 0.26, size * 0.045, theme.art.shadow);
  drawFigure(ctx, x, y, size, { ...player, pose, flip, time });
  ctx.translate(x + side * hand.x * size, y + hand.y * size);
  ctx.scale(side, 1);
  drawMallet(ctx, 0, 0, size * 0.62, { look: mallet, angle: raised ? -0.3 + Math.sin(time * 6) * 0.2 : angle }, theme);
  ctx.restore();
}
