import { FONT, softDay, themeFromTokens } from "../../../kit/src/canvas/index.js";

function freeze(value) {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
}

const PAINTS = [
  ["red", "#F26B5E"], ["coral", "#FF6B54"], ["orange", "#F39A45"], ["yellow", "#FFCF3F"],
  ["green", "#55B987"], ["leaf", "#3D8E56"], ["cyan", "#4BC6D7"], ["blue", "#4F9BE8"],
  ["purple", "#8D7DE8"], ["pink", "#F59BB7"], ["brown", "#9B6747"], ["white", "#FFFDF5"],
  ["skin1", "#F8D7BA"], ["skin2", "#EDB48C"], ["skin3", "#C9825B"], ["skin4", "#82513D"],
  ["rose", "#F9B8C8"], ["apricot", "#FFDDA0"], ["lime", "#B8E184"], ["sky", "#A9DFE8"],
  ["lilac", "#C9BCF5"], ["slate", "#596575"], ["grey", "#AAB6C4"], ["sand", "#EBCB83"],
];

export const PAINT_KEYS = Object.freeze(PAINTS.map(([key]) => key));

const INK = "#243247";
const PAPER = "#FFFDF8";

const ART = freeze({
  ink: INK,
  paints: PAINTS.map(([, colour]) => colour),
  rainbow: ["#FF6B54", "#F39A45", "#FFCF3F", "#55B987", "#4BC6D7", "#8D7DE8"],
  glitter: ["#FFCF3F", "#F59BB7", "#4BC6D7"],
  pot: { rim: "#FFF7DF", shine: "#FFFDF5" },
  tools: { handle: "#FFB15C", eraser: "#F59BB7", star: "#FFCF3F", spark: "#F59BB7", band: "#FFF7DF" },
  books: { landscapes: "#4BC6D7", vehicles: "#FF6B54", animals: "#55B987", stories: "#8D7DE8", nature: "#FFB15C", food: "#F59BB7", patterns: "#4F9BE8" },
  frames: ["#FFB15C", "#8D7DE8", "#4BC6D7", "#F59BB7"],
  markers: { mine: "#FF6B54", theirs: "#4BC6D7", cap: "#FFF7DF" },
  present: { box: "#8D7DE8", lid: "#B8ACF5", ribbon: "#FFCF3F", ink: INK },
  confetti: ["#FF6B54", "#FFCF3F", "#4BC6D7", "#F59BB7", "#8D7DE8", "#55B987"],
  miss: "#AAB6C4",
  mirror: "#8D7DE8",
});

const PAPERS = { light: PAPER, cream: "#FFF3D6", dark: "#303B59" };

function artFor(ui) {
  const soft = (colour) => softDay(colour, { dark: ui.dark });
  const papers = { light: soft(PAPERS.light), cream: soft(PAPERS.cream), dark: PAPERS.dark };
  return { ...ART, paper: papers.light, papers, rim: ui.rim };
}

const made = new Map();

export function themeFor(tokens, mode = {}) {
  const ui = themeFromTokens(tokens, mode);
  const key = JSON.stringify(ui);
  if (!made.has(key)) made.set(key, freeze({ font: FONT, stroke: { page: 2.5, pot: 2.5, tool: 3 }, ui, art: artFor(ui) }));
  return made.get(key);
}

export const THEME = themeFor(null);

export const LIGHT = themeFor(null, { dark: false });
