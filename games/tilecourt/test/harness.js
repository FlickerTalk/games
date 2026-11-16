import { vi } from "vitest";
import { fakeCore } from "../../../kit/test/helpers.js";
import { soundControls } from "../../../kit/src/sound/index.js";
import { spots } from "../src/court.js";
import { createGame } from "../src/game.js";
import { pieceOf } from "../src/pieces.js";

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
  const later = async (ms) => {
    clock += ms;
    game.frame(clock);
    await game.idle();
  };
  return { game, core, store, sound, asked, later, now: () => clock };
}

export async function tap(game, area) {
  const point = { x: area.x + area.w / 2, y: area.y + area.h / 2 };
  game.pointer({ type: "down", ...point });
  game.pointer({ type: "up", ...point });
  await game.idle();
}

export const targetOf = (game, kind, value) => game.targets().find((one) => one.kind === kind && (value === undefined || one.value === value));

export function pointOver(game, piece, at) {
  const { court, lift } = game.state.layout;
  const column = at % court.size;
  const row = Math.floor(at / court.size);
  return { x: court.x + (column + piece.width / 2) * court.cell, y: court.y + (row + piece.height / 2) * court.cell + lift };
}

export async function drag(game, slot, at) {
  const piece = pieceOf(game.state.round.slots[slot]);
  const zone = game.state.layout.slots[slot];
  game.pointer({ type: "down", x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 });
  const point = pointOver(game, piece, at);
  game.pointer({ type: "move", ...point });
  game.pointer({ type: "up", ...point });
  await game.idle();
}

export function anyMove(round) {
  for (let slot = 0; slot < round.slots.length; slot += 1) {
    const id = round.slots[slot];
    const found = id ? spots(round.court, pieceOf(id)) : [];
    if (found.length) return [slot, found[0]];
  }
  return null;
}

export async function playRound(game, later) {
  while (game.state.screen === "play" && !game.state.round.over) await drag(game, ...anyMove(game.state.round));
  await later(5000);
}
