import { circle, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawPiece } from "./pieces.js";

export const PROMOTIONS = Object.freeze(["q", "r", "b", "n"]);

export function promotionLayout(grid) {
  const { cell } = grid;
  const panel = { x: grid.x + cell * 0.1, y: grid.y + cell * 2.85, w: grid.w - cell * 0.2, h: cell * 2.3 };
  const choices = PROMOTIONS.map((type, at) => {
    const box = { x: grid.x + at * 2 * cell, y: grid.y + 3 * cell, w: 2 * cell, h: 2 * cell };
    return { type, box, x: box.x + cell, y: box.y + cell };
  });
  return { panel, choices };
}

export function drawPromotion(ctx, theme, grid, side) {
  const { ui } = theme;
  const { panel, choices } = promotionLayout(grid);
  ctx.save();
  ctx.fillStyle = ui.shade;
  ctx.fillRect(grid.x, grid.y, grid.w, grid.h);
  roundedRect(ctx, panel.x, panel.y, panel.w, panel.h, Math.min(ui.radius, grid.cell * 0.4));
  paint(ctx, ui.surface, ui.border, ui.line);
  for (const [at, { type, x, y }] of choices.entries()) {
    circle(ctx, x, y, grid.cell * 0.8, ui.surface2, at === 0 ? ui.accent : ui.border, ui.line);
    drawPiece(ctx, theme, side === 0 ? type.toUpperCase() : type, x, y, grid.cell * 1.45, { rim: side === 1 ? theme.rim : null });
  }
  ctx.restore();
}
