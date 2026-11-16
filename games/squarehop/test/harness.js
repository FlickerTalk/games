import { vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { soundControls } from "../../../kit/src/sound/index.js";
import { mayPick } from "../src/flow.js";
import { createGame } from "../src/game.js";

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
    drone: vi.fn(),
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
  const later = async (ms, step = 50) => {
    for (let left = ms; left > 0; left -= step) {
      clock += Math.min(step, left);
      game.frame(clock);
      await game.idle();
    }
  };
  return { game, core, store, sound, asked, later, now: () => clock };
}

export const targetOf = (game, kind, value) => game.targets().find((one) => one.kind === kind && (value === undefined || one.value === value));

export async function tap(game, area) {
  const point = { x: area.x + area.w / 2, y: area.y + area.h / 2 };
  game.pointer({ type: "down", ...point });
  game.pointer({ type: "up", ...point });
  await game.idle();
}

export async function untilPick({ game, later, now }, limit = 60_000) {
  for (let waited = 0; waited < limit && game.state.screen === "play" && !mayPick(game, now()); waited += 100) await later(100);
  return game.state.screen === "play" && mayPick(game, now());
}

export async function playOut(made, choice = () => 0) {
  for (let turns = 0; turns < 200 && (await untilPick(made)); turns += 1) await tap(made.game, targetOf(made.game, "die", choice(made.game.state.round)));
  await made.later(3000);
}

export const played = (sound) => sound.play.mock.calls.map(([name]) => name);
