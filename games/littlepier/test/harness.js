import { vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { soundControls } from "../../../kit/src/sound/index.js";
import { createGame } from "../src/game.js";
import { depthOf } from "../src/layout.js";
import { EDGE } from "../src/pond.js";
import { HOOK_X, LOWER } from "../src/round.js";

const FRAME = 16;

export function memoryStore(values = {}) {
  const kept = new Map(Object.entries(values));
  return { kept, get: vi.fn(async (key) => kept.get(key) ?? null), set: vi.fn(async (key, value) => (kept.set(key, value), true)), forget: async (key) => kept.delete(key) };
}

export function fakeSound() {
  let settings = { volume: 1, music: true };
  return {
    play: vi.fn(() => true),
    music: vi.fn(),
    drone: vi.fn(),
    pause: vi.fn(),
    get settings() {
      return { ...settings };
    },
    set: vi.fn((change) => (settings = { ...settings, ...change })),
    save: vi.fn(async () => true),
  };
}

export async function makeGame({ opening = {}, core = fakeCore(), store = memoryStore(), width = 384, height = 801, fill = true, seed = 7 } = {}) {
  const sound = fakeSound();
  let clock = 1000;
  let draws = seed;
  const asked = [];
  const game = createGame({
    ft: { ...core.ft, store },
    sound,
    controls: soundControls(sound),
    now: () => clock,
    random: () => (draws = (draws * 9301 + 49297) % 233280) / 233280,
    onAsk: (what) => asked.push(what),
  });
  await game.open({ lang: "en", live: false, ...opening, chat: "chat" in opening ? opening.chat : core.chat });
  game.resize(width, height, fill);
  const later = async (ms) => {
    const end = clock + ms;
    while (clock < end) {
      clock = Math.min(end, clock + FRAME);
      game.frame(clock);
    }
    await game.idle();
  };
  return { game, core, store, sound, asked, later, now: () => clock };
}

export async function tap(game, area) {
  const point = { x: area.x + area.w / 2, y: area.y + area.h / 2 };
  game.pointer({ type: "down", ...point, id: 1 });
  game.pointer({ type: "up", ...point, id: 1 });
  await game.idle();
}

export const targetOf = (game, kind, value) => game.targets().find((one) => one.kind === kind && (value === undefined || one.value === value));

export function hold(game) {
  const water = targetOf(game, "water");
  game.pointer({ type: "down", x: water.x + water.w / 2, y: water.y + water.h / 2, id: 7 });
}

export function letGo(game) {
  const water = targetOf(game, "water");
  game.pointer({ type: "up", x: water.x + water.w / 2, y: water.y + water.h / 2, id: 7 });
}

export const meetingAt = (round, depth) => round.time + depth / LOWER - (HOOK_X[0] + EDGE) / round.pace;

export function oneFish(game, { kind = 0, depth = 0.3, enter = null } = {}) {
  const { round } = game.state;
  const fish = { id: 0, kind, depth, speed: 1, direction: 1, enter: enter ?? round.time };
  game.state.round = { ...round, visitors: [fish] };
  return { fish, meets: fish.enter + (HOOK_X[0] + EDGE) / round.pace };
}

export async function catchOne(game, later, options) {
  const { fish, meets } = oneFish(game, options);
  const lead = fish.depth / LOWER;
  await later(Math.max(0, (meets - lead - game.state.round.time) * 1000));
  hold(game);
  await later((lead + 0.4) * 1000);
  letGo(game);
  const before = game.state.round.caught[0].length;
  for (let step = 0; step < 40 && game.state.round.caught[0].length === before; step += 1) await later(100);
  return fish;
}

export const hookY = (game, seat = 0) => depthOf(game.state.layout, game.state.round.hooks[seat].y);

export async function playOut(game, later) {
  while (game.state.screen === "play") await later(1000);
  await game.idle();
}
