import { vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { soundControls } from "../../../kit/src/sound/index.js";
import { createGame } from "../src/game.js";
import { rulerX } from "../src/layout.js";
import { FLIGHT, RIVAL_REVEAL, numberOf } from "../src/round.js";

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

export function touchRuler(game, share, type = "down") {
  const { layout } = game.state;
  game.pointer({ type, x: rulerX(layout, share), y: layout.ruler.y + layout.ruler.h / 2, id: 7 });
}

export function shootAt(game, share) {
  touchRuler(game, share, "down");
  touchRuler(game, share, "up");
}

export const truth = (game) => numberOf(game.state.round).share;

export const wholeShot = (FLIGHT + RIVAL_REVEAL) * 1000 + 100;

export async function playOut(game, later, aim = (share) => share) {
  for (let shot = 0; shot < 80 && game.state.screen === "play"; shot += 1) {
    if (!game.state.round.shot && !game.state.round.over) shootAt(game, aim(truth(game)));
    await later(wholeShot);
  }
  await game.idle();
}
