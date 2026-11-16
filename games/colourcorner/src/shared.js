import { required } from "./geometry.js";
import { FREE_PAGES, PAGE_ORDER, pageOf } from "./pages.js";
import { isPaint } from "./paints.js";
import { isFinished } from "./work.js";

const FILL = /^(0|[1-9]\d?):([^:]+)$/;

export const fillMove = (zone, token) => `${zone}:${token}`;

export function readFill(move, page) {
  const found = typeof move === "string" ? FILL.exec(move) : null;
  if (!found) return null;
  const zone = Number(found[1]);
  return zone < page.regions.length && isPaint(found[2]) ? { zone, token: found[2] } : null;
}

const initial = () => ({ page: null, fills: {}, moves: 0 });

const turn = (state) => state.moves % 2;

function result(state) {
  const page = pageOf(state.page);
  return page && isFinished(page, { fills: state.fills, items: [] }) ? { winner: null } : null;
}

function play(state, move, side) {
  if (result(state)) return { error: "over" };
  if (side !== turn(state)) return { error: "turn" };
  if (state.page === null) return pageOf(move) ? { state: { page: move, fills: {}, moves: 1 } } : { error: "page" };
  const fill = readFill(move, pageOf(state.page));
  if (!fill) return { error: "bad" };
  return { state: { page: state.page, fills: { ...state.fills, [fill.zone]: fill.token }, moves: state.moves + 1 } };
}

function move(state, side, memory, random) {
  if (state.page === null) return PAGE_ORDER[Math.floor(random() * FREE_PAGES)];
  const page = pageOf(state.page);
  const blank = required(page).filter((zone) => state.fills[zone] === undefined);
  const zone = blank[Math.floor(random() * blank.length)] ?? 0;
  return fillMove(zone, String(page.regions[zone].s));
}

export const SHARED = Object.freeze({ id: "colourcorner", gv: 1, initial, turn, play, result, robot: Object.freeze({ move }) });
