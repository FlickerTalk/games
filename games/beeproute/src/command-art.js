import { circle, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { MOST, slotsOf } from "./program.js";

export const ICONS = Object.freeze(["F", "L", "R", "U", "ring2", "ring3", "close", "undo", "play", "stop", "send"]);

const TURN = { F: 0, L: -Math.PI / 2, R: Math.PI / 2 };

function arrow(ctx, s, colour, turn) {
  ctx.rotate(turn);
  line(ctx, [[0, s * 0.22], [0, -s * 0.2]], colour, s * 0.1);
  polygon(ctx, [[0, -s * 0.34], [-s * 0.22, -s * 0.08], [s * 0.22, -s * 0.08]], colour);
}

function use(ctx, s, colour) {
  ellipse(ctx, 0, s * 0.08, s * 0.18, s * 0.18, null, colour, s * 0.07);
  line(ctx, [[0, -s * 0.3], [0, -s * 0.1]], colour, s * 0.08);
  line(ctx, [[-s * 0.24, -s * 0.16], [-s * 0.12, -s * 0.05]], colour, s * 0.07);
  line(ctx, [[s * 0.24, -s * 0.16], [s * 0.12, -s * 0.05]], colour, s * 0.07);
}

function ring(ctx, s, colour, digit, font) {
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
  paint(ctx, null, colour, s * 0.08);
  if (!digit) {
    line(ctx, [[-s * 0.14, 0], [-s * 0.03, s * 0.11], [s * 0.15, -s * 0.1]], colour, s * 0.08);
    return;
  }
  ctx.fillStyle = colour;
  ctx.font = `800 ${Math.round(s * 0.4)}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillText(digit, 0, s * 0.02);
}

function undo(ctx, s, colour) {
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.25, -Math.PI * 0.8, Math.PI * 0.65);
  paint(ctx, null, colour, s * 0.09);
  polygon(ctx, [[-s * 0.32, -s * 0.28], [-s * 0.34, s * 0.02], [-s * 0.08, -s * 0.08]], colour);
}

function send(ctx, s, colour) {
  polygon(ctx, [[-s * 0.3, -s * 0.22], [s * 0.32, 0], [-s * 0.3, s * 0.22], [-s * 0.14, 0]], colour);
}

export function drawIcon(ctx, icon, x, y, size, colour, font = "system-ui") {
  ctx.save();
  ctx.translate(x, y);
  if (icon in TURN) arrow(ctx, size, colour, TURN[icon]);
  else if (icon === "U") use(ctx, size, colour);
  else if (icon === "ring2" || icon === "ring3") ring(ctx, size, colour, icon.slice(-1), font);
  else if (icon === "close") ring(ctx, size, colour, null, font);
  else if (icon === "undo") undo(ctx, size, colour);
  else if (icon === "play") polygon(ctx, [[-size * 0.2, -size * 0.3], [size * 0.32, 0], [-size * 0.2, size * 0.3]], colour);
  else if (icon === "stop") {
    roundedRect(ctx, -size * 0.22, -size * 0.22, size * 0.44, size * 0.44, size * 0.08);
    paint(ctx, colour, null, 0);
  } else if (icon === "send") send(ctx, size, colour);
  ctx.restore();
}

export function drawCommandButton(ctx, target, icon, theme, { pressed = false, primary = false, chosen = false, dim = false } = {}) {
  const { ui } = theme;
  const fill = pressed ? ui.pressed : primary ? ui.accent : ui.surface;
  const edge = pressed || chosen ? ui.accent : primary ? ui.accent : ui.border;
  const glyph = primary && !pressed ? ui.onAccent : ui.text;
  const size = Math.min(target.w, target.h);
  ctx.save();
  if (dim) ctx.globalAlpha = 0.4;
  const sink = pressed ? 0.94 : 1;
  circle(ctx, target.x + target.w / 2, target.y + target.h / 2, (size / 2 - ui.line * (chosen ? 1.5 : 0.5)) * sink, fill, edge, chosen ? ui.line * 3 : ui.line);
  drawIcon(ctx, icon, target.x + target.w / 2, target.y + target.h / 2, size * 0.6 * sink, glyph, theme.font);
  ctx.restore();
}

const PAD = 6;
const GAP = 5;
const LARGEST = 54;

export function stripSlots(area, count) {
  const shown = Math.min(MOST, Math.max(count + 1, 6));
  let best = { size: 0, rows: 1, columns: shown };
  for (let rows = 1; rows <= 5; rows += 1) {
    const columns = Math.ceil(shown / rows);
    const wide = (area.w - 2 * PAD - GAP * (columns - 1)) / columns;
    const tall = (area.h - 2 * PAD - GAP * (rows - 1)) / rows / 1.12;
    const size = Math.min(LARGEST, wide, tall);
    if (size > best.size + 0.5) best = { size, rows, columns };
  }
  const { size, rows, columns } = best;
  const left = area.x + (area.w - (columns * size + (columns - 1) * GAP)) / 2;
  const top = area.y + (area.h - (rows * size * 1.12 + (rows - 1) * GAP)) / 2 + size * 0.12;
  return Array.from({ length: shown }, (_, at) => ({ x: left + (at % columns) * (size + GAP) + size / 2, y: top + Math.floor(at / columns) * (size * 1.12 + GAP) + size / 2, size }));
}

function slotCommands(items) {
  const list = [];
  const rings = [];
  for (const item of items) {
    if (typeof item === "string") list.push(item);
    else {
      rings.push({ from: list.length, to: list.length + item.body.length - 1, times: item.times });
      list.push(...item.body);
    }
  }
  return { list, rings };
}

function slot(ctx, spot, command, state, theme, time) {
  const { ui, art } = theme;
  const pulse = state === "running" ? 1.08 + Math.sin(time * 5) * 0.035 : 1;
  const s = spot.size * pulse;
  const look = {
    empty: [null, ui.border, ui.muted],
    filled: [ui.surface2, ui.border, ui.text],
    faded: [ui.surface2, ui.border, ui.muted],
    running: [art.running, art.ink, art.ink],
    wrong: [art.wrong, art.ink, art.white],
  }[state];
  roundedRect(ctx, spot.x - s / 2, spot.y - s / 2, s, s, s * 0.22);
  paint(ctx, look[0], look[1], Math.max(2, s * 0.05));
  if (command) drawIcon(ctx, command, spot.x, spot.y, s * 0.82, look[2], theme.font);
  else circle(ctx, spot.x, spot.y, s * 0.07, look[2]);
  if (state === "wrong") {
    line(ctx, [[spot.x + s * 0.22, spot.y - s * 0.34], [spot.x + s * 0.36, spot.y - s * 0.2]], art.white, s * 0.06);
    line(ctx, [[spot.x + s * 0.36, spot.y - s * 0.34], [spot.x + s * 0.22, spot.y - s * 0.2]], art.white, s * 0.06);
  }
}

function ringAround(ctx, spots, { from, to, times }, theme) {
  const { art } = theme;
  const rows = new Map();
  for (let at = from; at <= Math.min(to, spots.length - 1); at += 1) rows.set(spots[at].y, [...(rows.get(spots[at].y) ?? []), spots[at]]);
  let first = true;
  for (const row of rows.values()) {
    const s = row[0].size;
    const left = row[0].x - s / 2 - 3;
    const right = row.at(-1).x + s / 2 + 3;
    roundedRect(ctx, left, row[0].y - s / 2 - 3, right - left, s + 6, s * 0.35);
    paint(ctx, null, art.loop.ring, Math.max(3, s * 0.08));
    if (!first) continue;
    first = false;
    const badge = Math.max(9, s * 0.26);
    circle(ctx, right - badge * 0.3, row[0].y - s / 2 - 1, badge, art.loop.badge, art.ink, 2);
    ctx.fillStyle = art.loop.digit;
    ctx.font = `800 ${Math.round(badge * 1.25)}px ${theme.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "ltr";
    ctx.fillText(String(times), right - badge * 0.3, row[0].y - s / 2);
  }
}

function stateOf(at, used, { running = null, wrong = null }) {
  if (at === wrong) return "wrong";
  if (at === running) return "running";
  if (at >= used) return "empty";
  return wrong !== null && at > wrong ? "faded" : "filled";
}

export function drawStrip(ctx, area, edit, marks, theme, time) {
  const { ui } = theme;
  const used = slotsOf(edit.items);
  const spots = stripSlots(area, used);
  const { list, rings } = slotCommands(edit.items);
  if (edit.open && rings.length) rings.at(-1).to = Math.min(used, MOST - 1);
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  spots.forEach((spot, at) => slot(ctx, spot, list[at], stateOf(at, used, marks), theme, time));
  for (const one of rings) ringAround(ctx, spots, one, theme);
  ctx.restore();
}
