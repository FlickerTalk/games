import { vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { soundControls } from "../../../kit/src/sound/index.js";
import { createGame } from "../src/game.js";
import { turnOf, usefulNow } from "../src/round.js";

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
    random: () => ((draws = (draws * 9301 + 49297) % 233280) / 233280),
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

export const fitting = (game) => usefulNow(game.state.round.core, game.state.round.mySide);

export const unfitting = (game) => game.state.round.core.hands[game.state.round.mySide].filter((divisor) => !fitting(game).includes(divisor));

export const myTurn = (game) => turnOf(game.state.round.core) === game.state.round.mySide;

export async function settled(game, later) {
  for (let turn = 0; turn < 200 && game.state.screen === "play" && game.now() < game.state.round.busyUntil; turn += 1) await later(50);
}

export async function hitRight(game, later) {
  await settled(game, later);
  await tap(game, targetOf(game, "hit", fitting(game)[0]));
}

export async function finishRound(game, later, { limit = 600 } = {}) {
  for (let turn = 0; turn < limit && game.state.screen === "play"; turn += 1) {
    if (myTurn(game) && game.now() >= game.state.round.busyUntil && !game.state.round.core.over) await tap(game, targetOf(game, "hit", fitting(game)[0]));
    await later(100);
  }
}

export const played = (sound) => sound.play.mock.calls.map(([name]) => name);
