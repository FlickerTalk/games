import { vi } from "vitest";
import { soundControls } from "../../../kit/src/sound/index.js";
import { fakeCore } from "../../../kit/test/helpers.js";
import { createGame } from "../src/game.js";
import { pointOf } from "../src/layout.js";
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

export function finger(game, type, { x = 0.6, y = 0.9, id = 5 } = {}) {
  const [px, py] = pointOf(game.state.layout, x, y);
  game.pointer({ type, x: px, y: py, id });
}

const hands = new WeakMap();

export function playWell(game, skill = 0.95, pace = 1) {
  const { round } = game.state;
  if (!round || game.state.screen !== "play" || game.state.paused) return;
  if (!hands.has(round)) hands.set(round, createMind(`${round.match.seed}/hand/${round.seat}`));
  flickStep(round.match, round.seat, hands.get(round), { skill, pace: false });
  round.match.crafts[round.seat].pace = pace;
}

export function unclipped(ctx) {
  const points = [];
  let depth = 0;
  let clipped = null;
  for (const call of ctx.calls) {
    if (call.op === "save") depth += 1;
    else if (call.op === "restore") {
      depth -= 1;
      if (clipped !== null && depth < clipped) clipped = null;
    } else if (call.op === "clip" && clipped === null) clipped = depth;
    else if (clipped === null) points.push(...call.points);
  }
  return points;
}
