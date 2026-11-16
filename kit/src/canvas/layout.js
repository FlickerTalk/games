export const CORNER = 40;
export const GAP = 8;

export const box = (x, y, w, h) => ({ x, y, w, h });

export const centreOf = (area) => [area.x + area.w / 2, area.y + area.h / 2];

export const within = (area, { x, y }) => x >= area.x && x < area.x + area.w && y >= area.y && y < area.y + area.h;

export const overlap = (one, two) => one.x < two.x + two.w && two.x < one.x + one.w && one.y < two.y + two.h && two.y < one.y + one.h;

export const target = (kind, value, area) => ({ kind, value, ...area });

export const span = (count, size, gap = GAP) => count * size + Math.max(0, count - 1) * gap;

export function row(items, left, top, size, gap = GAP) {
  return items.map(([kind, value], at) => target(kind, value, box(left + at * (size + gap), top, size, size)));
}

export function grid(items, left, top, columns, size, gap = GAP) {
  return items.map(([kind, value], at) => target(kind, value, box(left + (at % columns) * (size + gap), top + Math.floor(at / columns) * (size + gap), size, size)));
}
