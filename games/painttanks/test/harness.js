import { vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { soundControls } from "../../../kit/src/sound/index.js";
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
  const game = createGame({
    ft: { ...core.ft, store },
    sound,
    controls: soundControls(sound),
    now: () => clock,
    random: () => ((draws = (draws * 9301 + 49297) % 233280) / 233280),
  });
  await game.open({ lang: "en", live: false, ...opening, chat: "chat" in opening ? opening.chat : core.chat });
  game.resize(width, height, fill);
  const later = async (ms, step = 50) => {
    for (let spent = 0; spent < ms; spent += step) {
      clock += step;
      game.frame(clock);
    }
    await game.idle();
  };
  return { game, core, store, sound, later, now: () => clock };
}

export async function tap(game, area) {
  const point = { x: area.x + area.w / 2, y: area.y + area.h / 2 };
  game.pointer({ type: "down", ...point });
  game.pointer({ type: "up", ...point });
  await game.idle();
}

export const targetOf = (game, kind, value) => game.targets().find((one) => one.kind === kind && (value === undefined || one.value === value));

export async function playRound(game, later, { limit = 60 } = {}) {
  for (let step = 0; step < limit && game.state.screen === "play"; step += 1) {
    if (game.myTurn()) await tap(game, targetOf(game, "fire"));
    await later(500);
  }
  await later(4000);
}
