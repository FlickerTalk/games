export function gridIn(box, { columns, rows = columns }) {
  const cell = Math.min(box.w / columns, box.h / rows);
  const w = cell * columns;
  const h = cell * rows;
  return Object.freeze({ x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h, cell, columns, rows });
}

const shownAt = (grid, index, flipped) => (flipped ? grid.columns * grid.rows - 1 - index : index);

export function cellBox(grid, index, { flipped = false } = {}) {
  const shown = shownAt(grid, index, flipped);
  return { x: grid.x + (shown % grid.columns) * grid.cell, y: grid.y + Math.floor(shown / grid.columns) * grid.cell, w: grid.cell, h: grid.cell };
}

export function cellCentre(grid, index, options) {
  const box = cellBox(grid, index, options);
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export function cellAt(grid, x, y, { flipped = false } = {}) {
  const column = Math.floor((x - grid.x) / grid.cell);
  const row = Math.floor((y - grid.y) / grid.cell);
  if (column < 0 || row < 0 || column >= grid.columns || row >= grid.rows) return null;
  return shownAt(grid, row * grid.columns + column, flipped);
}

export const fractionOf = (box, size) => ({ x: box.x / size, y: box.y / size, w: box.w / size, h: box.h / size });
