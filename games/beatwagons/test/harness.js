import { vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { soundControls } from "../../../kit/src/sound/index.js";
import { createGame } from "../src/game.js";
import { openGaps } from "../src/puzzle.js";

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

export const rightIndex = (round) => round.candidates.indexOf(round.puzzle.train.wagons[openGaps(round.puzzle)[0]]);
export const wrongIndex = (round) => round.candidates.findIndex((wagon) => wagon !== round.puzzle.train.wagons[openGaps(round.puzzle)[0]]);

export async function until(made, test, limit = 30_000) {
  for (let waited = 0; waited < limit && !test(made.game.state); waited += 50) await made.later(50);
  return test(made.game.state);
}

export async function completeTrain(made) {
  const { game } = made;
  await until(made, (state) => state.round.phase === "solve");
  while (game.state.round.phase === "solve" && openGaps(game.state.round.puzzle).length) {
    await tap(game, targetOf(game, "candidate", rightIndex(game.state.round)));
    await until(made, (state) => !state.round.flying);
  }
}

export async function completeRound(made) {
  const { game } = made;
  const trains = game.state.round.trains.length;
  for (let train = 0; train < trains; train += 1) {
    await completeTrain(made);
    if (train + 1 < trains) await until(made, (state) => state.round.at === train + 1);
  }
  await until(made, (state) => state.screen === "end");
}

export const played = (sound) => sound.play.mock.calls.map(([name]) => name);
