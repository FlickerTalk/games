export const KINDS = ".#~BGD";
export const SIZES = Object.freeze([5, 6, 7]);
export const LIMITS = Object.freeze({ batteries: 4, doors: 2 });
export const STEPS = Object.freeze([
  Object.freeze([0, -1]),
  Object.freeze([1, 0]),
  Object.freeze([0, 1]),
  Object.freeze([-1, 0]),
]);

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function makeLevel({ size, start, rows, cells = rows.join("") }) {
  return Object.freeze({ size, start: Object.freeze({ at: start.at, dir: start.dir }), cells });
}

const count = (level, kind) => [...level.cells].filter((one) => one === kind).length;

export function checkLevel(level) {
  const { size, start, cells } = level ?? {};
  if (!SIZES.includes(size) || typeof cells !== "string" || cells.length !== size * size) return "size";
  if ([...cells].some((one) => !KINDS.includes(one))) return "size";
  if (!Number.isInteger(start?.at) || cells[start.at] !== "." || !Number.isInteger(start.dir) || start.dir < 0 || start.dir > 3) return "start";
  if (count(level, "G") !== 1) return "goal";
  if (count(level, "B") > LIMITS.batteries) return "batteries";
  if (count(level, "D") > LIMITS.doors) return "doors";
  return null;
}

export const placeOf = (level, at) => ({ x: at % level.size, y: Math.floor(at / level.size) });

export const indexOf = (level, x, y) => y * level.size + x;

export function cellOf(level, x, y) {
  if (x < 0 || y < 0 || x >= level.size || y >= level.size) return null;
  return level.cells[indexOf(level, x, y)];
}

export function aheadOf(_level, { x, y, dir }) {
  const [dx, dy] = STEPS[dir];
  return { x: x + dx, y: y + dy };
}

export function encodeLevel(level) {
  const kinds = [...level.cells].map((one) => KINDS.indexOf(one));
  let packed = "";
  for (let at = 0; at < kinds.length; at += 2) packed += LETTERS[kinds[at] * 6 + (kinds[at + 1] ?? 0)];
  return `L${level.size}${LETTERS[level.start.at]}${level.start.dir}${packed}`;
}

function unpack(body, size) {
  let cells = "";
  for (const letter of body) {
    const value = LETTERS.indexOf(letter);
    if (value < 0 || value >= 36) return null;
    cells += KINDS[Math.floor(value / 6)] + KINDS[value % 6];
  }
  return cells.slice(0, size * size);
}

export function decodeLevel(code) {
  if (typeof code !== "string" || !/^L[5-7][A-Za-z0-9_-][0-3][A-Za-z0-9_-]+$/.test(code)) return null;
  const size = Number(code[1]);
  if (code.length !== 4 + Math.ceil((size * size) / 2)) return null;
  const cells = unpack(code.slice(4), size);
  if (!cells) return null;
  const level = makeLevel({ size, start: { at: LETTERS.indexOf(code[2]), dir: Number(code[3]) }, cells });
  return checkLevel(level) ? null : level;
}
