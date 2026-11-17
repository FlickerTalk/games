import { vi } from "vitest";
import { soundControls } from "../../../kit/src/sound/index.js";
import { fakeCore } from "../../../kit/test/helpers.js";
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
    get settings() {
      return { ...settings };
    },
    set: vi.fn((change) => (settings = { ...settings, ...change })),
    save: vi.fn(async () => true),
  };
}

export function gameOn(ft, { clock, seed = 7, store = memoryStore(), page } = {}) {
  const sound = fakeSound();
  let draws = seed;
  const asked = [];
  const game = createGame({
    ft: { ...ft, store },
    sound,
    controls: soundControls(sound),
    app: "1.0.0",
    now: clock,
    random: () => ((draws = (draws * 9301 + 49297) % 233280) / 233280),
    onAsk: (what) => asked.push(what),
    page,
  });
  return { game, sound, store, asked };
}

export async function makeGame({ opening = {}, core = fakeCore(), store = memoryStore(), width = 384, height = 801, fill = true, seed = 7 } = {}) {
  const time = { now: 1000 };
  const made = gameOn(core.ft, { clock: () => time.now, seed, store });
  const { game } = made;
  await game.open({ lang: "en", live: false, ...opening, chat: "chat" in opening ? opening.chat : core.chat });
  game.resize(width, height, fill);
  const later = async (ms, { frame = 16, each = () => {} } = {}) => {
    const end = time.now + ms;
    while (time.now < end) {
      time.now = Math.min(end, time.now + frame);
      each(game);
      game.frame(time.now);
    }
    await game.idle();
  };
  return { ...made, core, later, time };
}

export const targetOf = (game, kind, value) => game.targets().find((one) => one.kind === kind && (value === undefined || one.value === value));

export function tapAt(game, x, y, id = 1) {
  game.pointer({ type: "down", x, y, id });
  game.pointer({ type: "up", x, y, id });
}

export async function tap(game, target) {
  tapAt(game, target.x + target.w / 2, target.y + target.h / 2);
  await game.idle();
}

export async function press(game, kind, value) {
  const found = targetOf(game, kind, value);
  if (!found) throw new Error(`no ${kind} on ${game.state.screen}`);
  await tap(game, found);
}

export function onShow(game, wanted = (kind) => kind !== "cloud") {
  const { layout } = game.state;
  return game.onShow().filter((one) => wanted(one.balloon.kind) && one.y > layout.field.y + one.r && one.y < layout.field.y + layout.field.h - one.r);
}

export function pop(game, wanted = () => true) {
  const found = onShow(game).find(wanted);
  if (found && game.state.screen === "play" && !game.state.paused) tapAt(game, found.x, found.y, 9);
}

export const unhurried = (game) => (game.state.round?.step % 40 < 2 ? pop(game) : undefined);

export function drag(game, from, to, id = 3) {
  game.pointer({ type: "down", x: from.x, y: from.y, id });
  game.pointer({ type: "move", x: to.x, y: to.y, id });
  game.pointer({ type: "up", x: to.x, y: to.y, id });
}

export async function until(made, found, { most = 30_000 } = {}) {
  for (let waited = 0; waited < most; waited += 100) {
    const seen = found();
    if (seen) return seen;
    await made.later(100);
  }
  throw new Error("never happened");
}
