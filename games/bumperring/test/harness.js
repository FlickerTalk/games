import { vi } from "vitest";
import { soundControls } from "../../../kit/src/sound/index.js";
import { fakeCore } from "../../../kit/test/helpers.js";
import { createGame } from "../src/game.js";
import { createMind, flickStep } from "../src/robot.js";

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

export function gameOn(ft, { clock, seed = 7, store = memoryStore() } = {}) {
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

export async function tap(game, target) {
  const point = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
  game.pointer({ type: "down", ...point, id: 1 });
  game.pointer({ type: "up", ...point, id: 1 });
  await game.idle();
}

export async function press(game, kind, value) {
  const found = targetOf(game, kind, value);
  if (!found) throw new Error(`no ${kind} on ${game.state.screen}`);
  await tap(game, found);
}

export function finger(game, type, { slot = 0, id = 5 } = {}) {
  const area = game.state.layout.dash[slot];
  game.pointer({ type, x: area.x + area.w / 2, y: area.y + area.h / 2, id });
}

const hands = new WeakMap();

export function playWell(game, skill = 0.95) {
  const { round } = game.state;
  if (!round || game.state.screen !== "play") return;
  if (!hands.has(round)) hands.set(round, { mind: createMind(`${round.match.seed}/hand`), down: false, at: -1 });
  const hand = hands.get(round);
  if (hand.at === round.match.step) return;
  hand.at = round.match.step;
  const body = round.match.bodies[round.seat];
  const before = { down: body.down, tap: body.tap };
  flickStep(round.match, round.seat, hand.mind, { skill, pace: false });
  const wants = body.down;
  Object.assign(body, before);
  if (wants === hand.down) return;
  hand.down = wants;
  finger(game, wants ? "down" : "up");
}
