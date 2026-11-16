export const LEAST = 44;
const MOST_ROWS = 3;
const ROOM = 0.08;

export function handRows(count, { span, width, least = LEAST, most = MOST_ROWS }) {
  const fit = Math.max(1, Math.floor((span - width) / least) + 1);
  return Math.min(most, Math.max(1, Math.ceil(count / fit)));
}

function rowOf(box, count, width) {
  const spacing = count > 1 ? Math.min(width * (1 + ROOM), (box.w - width) / (count - 1)) : 0;
  const left = box.x + (box.w - width - spacing * (count - 1)) / 2;
  return { spacing, left };
}

export function handSlots(box, count, { width, height, rows = 1, step = 0, lift = 0, lifted = () => false }) {
  const perRow = Math.max(1, Math.ceil(count / rows));
  const rowTop = (row) => box.y + box.h - height - (rows - 1 - row) * step;
  const slots = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / perRow);
    const inRow = Math.min(perRow, count - row * perRow);
    const column = index - row * perRow;
    const { spacing, left } = rowOf(box, inRow, width);
    const raised = lifted(index) ? lift : 0;
    const [x, y] = [left + column * spacing, rowTop(row) - raised];
    const bottom = row === rows - 1 || row === Math.floor((count - 1) / perRow) ? rowTop(row) + height : rowTop(row + 1) - lift;
    const reachWidth = column === inRow - 1 ? width : spacing;
    slots.push({ x, y, w: width, h: height, row, reach: { x, y, w: reachWidth, h: bottom - y } });
  }
  return slots;
}
