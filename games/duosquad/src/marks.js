import { polygon } from "../../../kit/src/canvas/pen.js";

// The first seat's things carry a triangle and the second's a diamond, so they are told apart without colour.
export function drawSeatMark(ctx, x, y, size, seat, fill, stroke = null, width = 0) {
  const r = size / 2;
  const points = seat ? [[x, y - r], [x + r, y], [x, y + r], [x - r, y]] : [[x, y - r], [x + r * 0.9, y + r * 0.75], [x - r * 0.9, y + r * 0.75]];
  polygon(ctx, points, fill, stroke, width);
}
