import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PATH_ALPHABET } from "./src/path.js";

export const COURT_UNIT = 3;
const SIGN_UNIT = 1;
const SUIT_LETTERS = ["S", "H", "D", "C"];
const COURT_RANKS = ["J", "Q", "K"];
const NUMBER_FILES = ["AS", "2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "TS"];
const PIP_SIZE = "70";
const OPS = { M: 0, L: 1, C: 2, Z: 3 };
const LAYERS = [
  { fill: "#FC4" },
  { fill: "red" },
  { fill: "#44F" },
  { fill: "black" },
  { stroke: "#44F", width: "6" },
  { stroke: "#44F", width: "3" },
];

const tokensOf = (d) => [...d.matchAll(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi)].map((found) => found[0]);

function arcPoints(from, [rx, ry, turn, large, sweep], to) {
  const [cos, sin] = [Math.cos((turn * Math.PI) / 180), Math.sin((turn * Math.PI) / 180)];
  const [hx, hy] = [(from[0] - to[0]) / 2, (from[1] - to[1]) / 2];
  const [px, py] = [cos * hx + sin * hy, -sin * hx + cos * hy];
  const grow = Math.max(1, Math.sqrt((px * px) / (rx * rx) + (py * py) / (ry * ry)));
  const [ax, ay] = [Math.abs(rx) * grow, Math.abs(ry) * grow];
  const spread = (ax * ax * ay * ay - ax * ax * py * py - ay * ay * px * px) / (ax * ax * py * py + ay * ay * px * px);
  const factor = Math.sqrt(Math.max(0, spread)) * (large === sweep ? -1 : 1);
  const [ox, oy] = [(factor * ax * py) / ay, (-factor * ay * px) / ax];
  const centre = [cos * ox - sin * oy + (from[0] + to[0]) / 2, sin * ox + cos * oy + (from[1] + to[1]) / 2];
  const angleOf = (x, y) => Math.atan2((y - oy) / ay, (x - ox) / ax);
  const start = angleOf(px, py);
  let sweepAngle = angleOf(-px, -py) - start;
  if (sweep && sweepAngle < 0) sweepAngle += 2 * Math.PI;
  if (!sweep && sweepAngle > 0) sweepAngle -= 2 * Math.PI;
  return { centre, radii: [ax, ay], cos, sin, start, sweepAngle };
}

function arcCurves(from, args, to) {
  if (!args[0] || !args[1]) return [["C", ...from, ...to, ...to]];
  const { centre, radii, cos, sin, start, sweepAngle } = arcPoints(from, args, to);
  const parts = Math.max(1, Math.ceil(Math.abs(sweepAngle) / (Math.PI / 2) - 1e-9));
  const step = sweepAngle / parts;
  const handle = (4 / 3) * Math.tan(step / 4);
  const at = (angle) => [centre[0] + radii[0] * Math.cos(angle) * cos - radii[1] * Math.sin(angle) * sin, centre[1] + radii[0] * Math.cos(angle) * sin + radii[1] * Math.sin(angle) * cos];
  const slope = (angle) => [-radii[0] * Math.sin(angle) * cos - radii[1] * Math.cos(angle) * sin, -radii[0] * Math.sin(angle) * sin + radii[1] * Math.cos(angle) * cos];
  const curves = [];
  for (let part = 0; part < parts; part += 1) {
    const [a, b] = [start + step * part, start + step * (part + 1)];
    const [p, q, da, db] = [at(a), at(b), slope(a), slope(b)];
    curves.push(["C", p[0] + handle * da[0], p[1] + handle * da[1], q[0] - handle * db[0], q[1] - handle * db[1], ...(part === parts - 1 ? to : q)]);
  }
  return curves;
}

const COUNTS = { M: 2, L: 2, H: 1, V: 1, C: 6, A: 7, Z: 0 };

function step(command, values, pen) {
  const relative = command !== command.toUpperCase();
  const kind = command.toUpperCase();
  const [x, y] = pen.at;
  const shift = (list) => (relative ? list.map((value, at) => value + (at % 2 ? y : x)) : list);
  if (kind === "Z") {
    pen.at = pen.start;
    return [["Z"]];
  }
  if (kind === "H") return step("L", [relative ? values[0] + x : values[0], y], pen);
  if (kind === "V") return step("L", [x, relative ? values[0] + y : values[0]], pen);
  if (kind === "A") {
    const to = relative ? [values[5] + x, values[6] + y] : values.slice(5);
    pen.at = to;
    return arcCurves([x, y], values.slice(0, 5), to);
  }
  const points = shift(values);
  pen.at = points.slice(-2);
  if (kind === "M") pen.start = pen.at;
  return [[kind, ...points]];
}

export function pathCommands(d) {
  const tokens = tokensOf(d);
  const segments = [];
  const pen = { at: [0, 0], start: [0, 0] };
  let command = null;
  let at = 0;
  while (at < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[at])) command = tokens[at++];
    const count = COUNTS[command.toUpperCase()];
    if (count === undefined) throw new Error(`path command ${command} is not read`);
    segments.push(...step(command, tokens.slice(at, at + count).map(Number), pen));
    at += count;
    if (command === "M") command = "L";
    if (command === "m") command = "l";
  }
  return segments;
}

function unsigned(value) {
  let rest = value;
  let text = "";
  do {
    const low = rest % 32;
    rest = Math.floor(rest / 32);
    text += PATH_ALPHABET[low + (rest > 0 ? 32 : 0)];
  } while (rest > 0);
  return text;
}

const signed = (value) => unsigned(value >= 0 ? value * 2 : -value * 2 - 1);

function offChord([x0, y0], [x1, y1], [px, py]) {
  const [dx, dy] = [x1 - x0, y1 - y0];
  const length = Math.hypot(dx, dy);
  return length ? Math.abs((px - x0) * dy - (py - y0) * dx) / length : Math.hypot(px - x0, py - y0);
}

function straightened(segments, unit) {
  let pen = [0, 0];
  let start = pen;
  return segments.map(([op, ...values]) => {
    const from = pen;
    if (op === "Z") pen = start;
    else pen = values.slice(-2);
    if (op === "M") start = pen;
    if (op !== "C") return [op, ...values];
    const flat = [values.slice(0, 2), values.slice(2, 4)].every((point) => offChord(from, pen, point) <= unit / 2);
    return flat ? ["L", ...pen] : [op, ...values];
  });
}

export function encodePath(segments, unit) {
  const steps = straightened(segments, unit);
  let text = "";
  let last = [0, 0];
  for (let at = 0; at < steps.length; ) {
    const op = steps[at][0];
    let end = at;
    while (end < steps.length && steps[end][0] === op) end += 1;
    text += unsigned(OPS[op] + 4 * (end - at - 1));
    for (const [, ...values] of steps.slice(at, end)) {
      for (let point = 0; point < values.length; point += 2) {
        const next = [Math.round(values[point] / unit), Math.round(values[point + 1] / unit)];
        text += signed(next[0] - last[0]) + signed(next[1] - last[1]);
        last = next;
      }
    }
    at = end;
  }
  return text;
}

const attribute = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
const symbolPath = (svg, id) => attribute(new RegExp(`<symbol id="${id}"[^>]*>\\s*<path[^>]*>`).exec(svg)?.[0] ?? "", "d");
const sign = (d) => encodePath(pathCommands(d), SIGN_UNIT);
const centred = (tag) => ["x", "y"].map((name) => Math.round((Number(attribute(tag, name)) + Number(attribute(tag, "width")) / 2) * 100) / 100);

function numberPips(svg) {
  const [top, turned] = svg.split("</defs>")[1].split('<g transform="rotate(180)">');
  const pips = (part) => [...part.matchAll(/<use xlink:href="#S[^"]*"[^>]*>/g)].map(([tag]) => tag).filter((tag) => attribute(tag, "width") === PIP_SIZE).map(centred);
  return { top: pips(top), turned: pips(turned ?? "") };
}

function courtPip(tag, layer, name) {
  const size = Number(attribute(tag, "width"));
  const found = /^translate\(([-\d.]+),([-\d.]+)\)scale\(1,0\.972\)rotate\(([-\d.]+)\)translate\(([-\d.]+),([-\d.]+)\)$/.exec(attribute(tag, "transform") ?? "");
  const half = -Math.floor(size / 2);
  if (!found || layer !== 6 || Number(found[4]) !== half || Number(found[5]) !== half) throw new Error(`${name}: a suit mark placed in a way this reader does not know`);
  return [Number(found[1]), Number(found[2]), size, Number(found[3]), attribute(tag, "stroke") ? 1 : 0];
}

function readCourt(svg, name) {
  const layers = [];
  const pips = [];
  for (const [, number, body] of svg.matchAll(/<symbol id="..(\d)"[^>]*viewBox="0 0 1300 2000">(.*?)<\/symbol>/gs)) {
    const layer = Number(number);
    const path = /<path[^>]*>/.exec(body)[0];
    const look = LAYERS[layer - 1];
    if (look.fill ? attribute(path, "fill") !== look.fill : attribute(path, "stroke") !== look.stroke || attribute(path, "stroke-width") !== look.width) throw new Error(`${name}: layer ${layer} is not drawn as expected`);
    layers[layer - 1] = encodePath(pathCommands(attribute(path, "d")), COURT_UNIT);
    for (const [tag] of body.matchAll(/<use[^>]*>/g)) pips.push(courtPip(tag, layer, name));
  }
  const corner = /<use xlink:href="#S[^"]*" height="55.68" width="55.68"[^>]*>/.exec(svg.split("</defs>")[1])[0];
  return { layers, pips, corner: centred(corner) };
}

export function readDeck(dir) {
  const svg = (name) => readFileSync(join(dir, `${name}.svg`), "utf8");
  const courts = SUIT_LETTERS.flatMap((suit) => COURT_RANKS.map((rank) => readCourt(svg(`${rank}${suit}`), `${rank}${suit}`)));
  const suits = SUIT_LETTERS.map((suit) => sign(symbolPath(svg(`J${suit}`), `S${suit}J`)));
  const ranks = [...NUMBER_FILES.map((name) => sign(symbolPath(svg(name), `VS${name[0]}`))), ...COURT_RANKS.map((rank) => sign(symbolPath(svg(`${rank}S`), `VS${rank}`)))];
  return { suits, ranks, pips: NUMBER_FILES.map((name) => numberPips(svg(name))), courts };
}

export function deckModule(deck) {
  return (
    "// The Plain deck of Adrian Kennard's playing cards (CC0 1.0), written by `node games/eights/build.js` from vendor/revk: do not edit.\n" +
    `export const COURT_UNIT = ${COURT_UNIT};\n` +
    `export const SUITS = ${JSON.stringify(deck.suits)};\n` +
    `export const RANKS = ${JSON.stringify(deck.ranks)};\n` +
    `export const PIPS = ${JSON.stringify(deck.pips)};\n` +
    `export const COURTS = ${JSON.stringify(deck.courts)};\n`
  );
}

if (process.argv[1] === import.meta.filename) {
  const dir = import.meta.dirname;
  writeFileSync(join(dir, "src", "deck.js"), deckModule(readDeck(join(dir, "vendor", "revk"))));
  console.log("eights: src/deck.js written");
}
