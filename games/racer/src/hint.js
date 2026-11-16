export const TOUCH_HINT_EXTENT = { left: 0.62, right: 0.62, up: 0.27, down: 1.06 };
export const HINT_MARGIN = 8;
const EXTENT = TOUCH_HINT_EXTENT;
const LARGEST = 96;
const SMALLEST = 40;
const GAP = 6;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function placeHint({ width, height, carX, carBottom }) {
  const tall = EXTENT.up + EXTENT.down;
  const wide = EXTENT.left + EXTENT.right;
  const roomBelow = height - HINT_MARGIN - GAP - carBottom;
  const wanted = clamp(roomBelow / tall, SMALLEST, LARGEST);
  const size = Math.min(wanted, (width - 2 * HINT_MARGIN) / wide, (height - 2 * HINT_MARGIN) / tall);
  return {
    size,
    x: clamp(carX, HINT_MARGIN + EXTENT.left * size, width - HINT_MARGIN - EXTENT.right * size),
    y: clamp(carBottom + GAP + EXTENT.up * size, HINT_MARGIN + EXTENT.up * size, height - HINT_MARGIN - EXTENT.down * size),
  };
}
