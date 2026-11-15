import { HAIRS, HAIR_COLOURS, PROFILES } from "./cast.js";
import { cleanName, normalizePlayer } from "./player.js";
import { avatarText, colourKey, emblemKey, hairKey } from "./words.js";

export const PICK_TARGET = 88;

const PAD = 12;
const GAP = 10;
const TITLE = 40;
const HAIR_ITEM = 96;
const COLOUR_ITEM = 88;
const ITEM_GAP = 8;
const NAME_WIDTH = 220;
const MOST_CELL = 150;
const MOST_AVATAR = 240;
const OVERLAP = 20;
const SLOP = 8;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const inside = (box, x, y) => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
const box = (x, y, w, h) => ({ x, y, w, h });
const indexOf = (list, id) => Math.max(0, list.findIndex((one) => one.id === id));
const STRIDE = { hair: HAIR_ITEM + ITEM_GAP, colour: COLOUR_ITEM + ITEM_GAP };

export function startPick(choice) {
  return { step: "profile", choice: normalizePlayer(choice), scroll: { hair: 0, colour: 0 }, press: null };
}

function profileLayout(state, width, height, lang) {
  const area = box(PAD, PAD + TITLE + GAP, width - 2 * PAD, height - 2 * PAD - TITLE - GAP);
  let best = null;
  for (const cols of [2, 3, 4, 6, 12]) {
    const rows = Math.ceil(PROFILES.length / cols);
    const cell = Math.min((area.w - (cols - 1) * GAP) / cols, (area.h - (rows - 1) * GAP) / rows, MOST_CELL);
    if (!best || cell > best.cell) best = { cols, rows, cell };
  }
  const cell = Math.floor(Math.max(best.cell, PICK_TARGET));
  const gridWidth = best.cols * cell + (best.cols - 1) * GAP;
  const gridHeight = best.rows * cell + (best.rows - 1) * GAP;
  const left = area.x + (area.w - gridWidth) / 2;
  const top = area.y + Math.max(0, (area.h - gridHeight) / 2);
  const targets = PROFILES.map((profile, at) => ({
    kind: "profile",
    value: profile.id,
    ...box(left + (at % best.cols) * (cell + GAP), top + Math.floor(at / best.cols) * (cell + GAP), cell, cell),
    label: avatarText(lang, "profile", { name: profile.name, emblem: avatarText(lang, emblemKey(profile.emblem)) }),
    selected: profile.id === state.choice.who,
    visible: true,
  }));
  return { width, height, step: "profile", title: { text: avatarText(lang, "pick"), x: width / 2, y: top - GAP - TITLE / 2 }, strips: [], targets };
}

function strip(kind, area, state, lang) {
  const [items, size, chosen, keyOf, label] =
    kind === "hair" ? [HAIRS, HAIR_ITEM, state.choice.hair, hairKey, "hair"] : [HAIR_COLOURS, COLOUR_ITEM, state.choice.hairColour, colourKey, "hairColour"];
  const most = Math.max(0, items.length * size + (items.length - 1) * ITEM_GAP - area.w);
  const scroll = clamp(state.scroll?.[kind] ?? 0, 0, most);
  const targets = items.map((item, at) => {
    const x = area.x + at * (size + ITEM_GAP) - scroll;
    return { kind, value: item.id, strip: kind, ...box(x, area.y, size, size), label: avatarText(lang, keyOf(item.id)), selected: item.id === chosen, visible: x < area.x + area.w && x + size > area.x };
  });
  return { strip: { kind, ...area, scroll, most, label: avatarText(lang, label) }, targets };
}

function control(kind, area, lang, label = kind) {
  return { kind, value: kind, ...area, label: avatarText(lang, label), selected: false, visible: true };
}

const avatarIn = (area) => Math.floor(Math.min(MOST_AVATAR, Math.min(area.w, area.h) / 1.3));

function settle(area, size) {
  const h = Math.min(area.h, Math.ceil(size * 1.3));
  return { ...box(area.x, area.y + area.h - h, area.w, h), size };
}

function tallLook(width, height) {
  const hairY = height - PAD - COLOUR_ITEM - GAP - HAIR_ITEM;
  const nameWidth = Math.min(NAME_WIDTH, width - 2 * PAD);
  const name = box((width - nameWidth) / 2, hairY - GAP - PICK_TARGET, nameWidth, PICK_TARGET);
  const below = name.y + OVERLAP;
  const beside = box(PAD + PICK_TARGET + GAP, PAD, width - 2 * (PAD + PICK_TARGET + GAP), below - PAD);
  const under = box(PAD, PAD + PICK_TARGET + GAP, width - 2 * PAD, below - PAD - PICK_TARGET - GAP);
  const area = avatarIn(under) > avatarIn(beside) ? under : beside;
  return { column: box(PAD, PAD, width - 2 * PAD, 0), hairY, name, preview: settle(area, avatarIn(area)) };
}

function wideLook(width, height) {
  const side = Math.min(height - 2 * PAD, Math.floor(width * 0.42));
  const size = avatarIn(box(0, 0, side, height - 2 * PAD - PICK_TARGET + OVERLAP));
  const block = Math.ceil(size * 1.3) + PICK_TARGET - OVERLAP;
  const top = PAD + Math.max(0, (height - 2 * PAD - block) / 2);
  const stack = PICK_TARGET + GAP + HAIR_ITEM + GAP + COLOUR_ITEM;
  const columnTop = PAD + Math.max(0, (height - 2 * PAD - stack) / 2);
  const nameWidth = Math.min(NAME_WIDTH, side);
  const name = box(PAD + (side - nameWidth) / 2, top + Math.ceil(size * 1.3) - OVERLAP, nameWidth, PICK_TARGET);
  const column = box(PAD + side + GAP, columnTop, width - 2 * PAD - side - GAP, 0);
  return { column, hairY: columnTop + PICK_TARGET + GAP, name, preview: settle(box(PAD, top, side, Math.ceil(size * 1.3)), size) };
}

function lookLayout(state, width, height, lang) {
  const { column, hairY, name, preview } = width >= height * 1.25 ? wideLook(width, height) : tallLook(width, height);
  const hair = strip("hair", box(column.x, hairY, column.w, HAIR_ITEM), state, lang);
  const colour = strip("colour", box(column.x, hairY + HAIR_ITEM + GAP, column.w, COLOUR_ITEM), state, lang);
  const back = control("back", box(column.x, column.y, PICK_TARGET, PICK_TARGET), lang);
  const done = control("done", box(column.x + column.w - PICK_TARGET, column.y, PICK_TARGET, PICK_TARGET), lang);
  const rename = control("rename", name, lang);
  return { width, height, step: "look", preview, strips: [hair.strip, colour.strip], targets: [back, done, rename, ...hair.targets, ...colour.targets] };
}

export function pickLayout(state, width, height, lang = "en") {
  return state.step === "look" ? lookLayout(state, width, height, lang) : profileLayout(state, width, height, lang);
}

export function pickAt(layout, x, y) {
  for (const target of layout.targets) {
    const strip = target.strip ? layout.strips.find((one) => one.kind === target.strip) : null;
    if (strip && !inside(strip, x, y)) continue;
    if (inside(target, x, y)) return target;
  }
  return null;
}

const known = (list, id) => list.some((one) => one.id === id);

function choose(state, changes) {
  return { state: { ...state, choice: { ...state.choice, ...changes } }, ask: null };
}

export function pickPress(state, target) {
  const kind = target?.kind;
  if (kind === "profile" && known(PROFILES, target.value)) {
    const scroll = { hair: indexOf(HAIRS, state.choice.hair) * STRIDE.hair, colour: indexOf(HAIR_COLOURS, state.choice.hairColour) * STRIDE.colour };
    return { state: { ...state, step: "look", choice: { ...state.choice, who: target.value }, scroll, press: null }, ask: null };
  }
  if (kind === "back") return { state: { ...state, step: "profile", press: null }, ask: null };
  if (kind === "hair" && known(HAIRS, target.value)) return choose(state, { hair: target.value });
  if (kind === "colour" && known(HAIR_COLOURS, target.value)) return choose(state, { hairColour: target.value });
  if (kind === "rename" || kind === "done") return { state, ask: kind };
  return { state, ask: null };
}

export function pickRename(state, text) {
  return { ...state, choice: { ...state.choice, name: cleanName(text) } };
}

const same = (one, two) => Boolean(one && two) && one.kind === two.kind && one.value === two.value;

export function pickPointer(state, layout, event) {
  const { type, x, y } = event ?? {};
  if (type === "down") {
    const strip = layout.strips.find((one) => inside(one, x, y));
    const target = pickAt(layout, x, y);
    const press = { x, y, strip: strip?.kind ?? null, scroll: strip?.scroll ?? 0, moved: false, target: target && { kind: target.kind, value: target.value } };
    return { state: { ...state, press }, ask: null };
  }
  const press = state.press;
  if (!press) return { state, ask: null };
  if (type === "move") {
    const moved = press.moved || Math.abs(x - press.x) > SLOP || Math.abs(y - press.y) > SLOP;
    const strip = layout.strips.find((one) => one.kind === press.strip);
    const scroll = strip ? { ...state.scroll, [strip.kind]: clamp(press.scroll - (x - press.x), 0, strip.most) } : state.scroll;
    return { state: { ...state, scroll, press: { ...press, moved } }, ask: null };
  }
  const rest = { ...state, press: null };
  const target = type === "up" ? pickAt(layout, x, y) : null;
  if (press.moved || !same(target, press.target)) return { state: rest, ask: null };
  return pickPress(rest, target);
}
