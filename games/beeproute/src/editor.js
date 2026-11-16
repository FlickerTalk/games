import { LIMITS, makeLevel } from "./level.js";
import { MOST } from "./program.js";
import { shortest } from "./solver.js";

export const BUILD_SIZE = 6;
export const TOOLS = Object.freeze(["wall", "puddle", "battery", "door", "goal", "robot"]);
export const KIND = Object.freeze({ wall: "#", puddle: "~", battery: "B", door: "D" });
const LIMIT = Object.freeze({ B: LIMITS.batteries, D: LIMITS.doors });

export function blankLevel(size = BUILD_SIZE) {
  const cells = Array(size * size).fill(".");
  cells[size - 1] = "G";
  return makeLevel({ size, start: { at: size * (size - 1), dir: 0 }, cells: cells.join("") });
}

const refused = (level) => ({ level, changed: false, refused: true });

function rebuilt(level, cells, start = level.start) {
  return { level: makeLevel({ size: level.size, start, cells: cells.join("") }), changed: true, refused: false };
}

function placeGoal(level, cells, at) {
  if (at === level.start.at) return refused(level);
  if (cells[at] === "G") return { level, changed: false, refused: false };
  cells[cells.indexOf("G")] = ".";
  cells[at] = "G";
  return rebuilt(level, cells);
}

function placeRobot(level, cells, at) {
  if (at === level.start.at) return rebuilt(level, cells, { at, dir: (level.start.dir + 1) % 4 });
  if (cells[at] === "G") return refused(level);
  cells[at] = ".";
  return rebuilt(level, cells, { at, dir: level.start.dir });
}

export function paint(level, tool, at) {
  const cells = [...level.cells];
  if (!Number.isInteger(at) || at < 0 || at >= cells.length) return refused(level);
  if (tool === "goal") return placeGoal(level, cells, at);
  if (tool === "robot") return placeRobot(level, cells, at);
  const kind = KIND[tool];
  if (!kind || at === level.start.at || cells[at] === "G") return refused(level);
  if (cells[at] === kind) {
    cells[at] = ".";
    return rebuilt(level, cells);
  }
  if (LIMIT[kind] !== undefined && cells.filter((one) => one === kind).length >= LIMIT[kind]) return refused(level);
  cells[at] = kind;
  return rebuilt(level, cells);
}

export function checkBuilt(level) {
  const way = shortest(level);
  return way && way.length <= MOST ? { ok: true, best: way.length } : { ok: false, best: null };
}
