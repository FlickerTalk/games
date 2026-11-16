import { vi } from "vitest";
import { soundControls } from "../../../kit/src/sound/index.js";
import { fakeCore } from "../../../kit/test/helpers.js";
import { exchangeAt } from "../src/duel.js";
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
      each(game, time);
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

export function strikeNow(game, pad = 0) {
  const found = targetOf(game, "strike", pad);
  if (found) tapAt(game, found.x + found.w / 2, found.y + found.h / 2, 9 + pad);
}

export function phaseOf(game) {
  const { round } = game.state;
  const exchange = round && exchangeAt(round.schedule, round.step);
  if (!exchange) return { exchange: null, phase: "rest" };
  const phase = round.verdicts.has(exchange.x) ? "rest" : round.step < exchange.signal ? "wait" : round.step < exchange.close ? "go" : "rest";
  return { exchange, phase };
}

// taps `after` ms once the bell is on screen, on every exchange
export function reacting(after, pad = 0) {
  const seen = new Map();
  return (game, time) => {
    const { round, screen, paused } = game.state;
    if (screen !== "play" || paused || !round) return;
    const { exchange, phase } = phaseOf(game);
    if (phase !== "go" || !round.shown.has(exchange.x)) return;
    const key = `${round.seed}/${exchange.x}`;
    if (!seen.has(key)) seen.set(key, time.now);
    if (time.now - seen.get(key) >= after && !round.claims[game.state.round.kind === "pair" ? pad : round.seat].some((one) => one.x === exchange.x)) strikeNow(game, pad);
  };
}

export async function until(made, found, { most = 30_000, step = 16 } = {}) {
  for (let waited = 0; waited < most; waited += step) {
    const seen = found();
    if (seen) return seen;
    await made.later(step);
  }
  throw new Error("never happened");
}
