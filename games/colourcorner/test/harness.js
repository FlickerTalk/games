import { vi } from "vitest";
import { soundControls } from "../../../kit/src/sound/index.js";
import { fakeCore } from "../../../kit/test/helpers.js";
import { required, zonesOf } from "../src/geometry.js";
import { createGame } from "../src/game.js";
import { pageOf } from "../src/pages.js";

export function memoryStore(values = {}) {
  const kept = new Map(Object.entries(values));
  return { kept, get: vi.fn(async (key) => kept.get(key) ?? null), set: vi.fn(async (key, value) => (kept.set(key, value), true)), forget: async (key) => kept.delete(key) };
}

export function fakeSound() {
  let settings = { volume: 1, music: true };
  return {
    play: vi.fn(() => true),
    music: vi.fn(),
    pause: vi.fn(),
    get settings() {
      return { ...settings };
    },
    set: vi.fn((change) => (settings = { ...settings, ...change })),
    save: vi.fn(async () => true),
  };
}

export async function makeGame({ opening = {}, core = fakeCore(), store = memoryStore(), width = 384, height = 801, fill = true, timing } = {}) {
  const sound = fakeSound();
  let clock = 1000;
  let draws = 7;
  const asked = [];
  const exported = [];
  const game = createGame({
    ft: { ...core.ft, store },
    sound,
    controls: soundControls(sound),
    now: () => clock,
    random: () => (draws = (draws * 9301 + 49297) % 233280) / 233280,
    onAsk: (what) => asked.push(what),
    picture: (picture) => (exported.push(picture), "aGVsbG8="),
    timing,
  });
  await game.open({ lang: "en", live: false, ...opening, chat: "chat" in opening ? opening.chat : core.chat });
  game.resize(width, height, fill);
  const later = async (ms) => {
    clock += ms;
    game.frame(clock);
    await game.idle();
  };
  return { game, core, store, sound, asked, exported, later, now: () => clock };
}

export const targetOf = (game, kind, value) => game.targets().find((one) => one.kind === kind && (value === undefined || one.value === value) && one.visible !== false);

export async function tapAt(game, point) {
  game.pointer({ type: "down", ...point });
  game.pointer({ type: "up", ...point });
  await game.idle();
}

export async function choose(game, kind, value) {
  const strip = game.state.layout.strips.find((one) => one.items.some((item) => item.kind === kind && item.value === value));
  game.state.scroll[strip.id] = 0;
  for (let step = 0; step < 60 && !targetOf(game, kind, value); step += 1) game.state.scroll[strip.id] += 96;
  await tap(game, kind, value);
}

export async function tap(game, kind, value) {
  const found = targetOf(game, kind, value);
  if (!found) throw new Error(`no ${kind} ${value ?? ""} on ${game.state.screen}`);
  await tapAt(game, { x: found.x + found.w / 2, y: found.y + found.h / 2 });
}

export function zonePoint(game, zone) {
  const { page } = game.state.layout;
  const [x, y] = zonesOf(pageOf(game.state.page)).at(zone).anchor;
  return { x: page.x + x * page.scale, y: page.y + y * page.scale };
}

export const tapZone = (game, zone) => tapAt(game, zonePoint(game, zone));

export async function drag(game, points) {
  const [first, ...rest] = points;
  game.pointer({ type: "down", ...first });
  for (const point of rest) game.pointer({ type: "move", ...point });
  game.pointer({ type: "up", ...points.at(-1) });
  await game.idle();
}

export const pagePoint = (game, x, y) => {
  const { page } = game.state.layout;
  return { x: page.x + x * page.scale, y: page.y + y * page.scale };
};

export async function colourAll(game, later) {
  for (const zone of required(pageOf(game.state.page))) if (game.state.work.fills[zone] === undefined) await tapZone(game, zone);
  await later(2000);
}

export async function openPage(game, id) {
  await tap(game, "variant", "pages");
  await tap(game, "play");
  while (!targetOf(game, "tile", id) && targetOf(game, "next")) await tap(game, "next");
  await tap(game, "tile", id);
}
