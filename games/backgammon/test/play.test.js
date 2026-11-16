import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, seeded, settle, within } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-backgammon")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");

async function phone(core, opening = {}) {
  const element = document.createElement("ft-backgammon");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, selector) {
  const node = within(element, selector);
  if (!node) throw new Error(`nothing to touch: ${selector}`);
  node.click();
  await tick();
  await tick();
}

const LIVE = '.fbg [data-to], .fbg [data-from]:not([disabled]), .fbg [data-act="pass"]:not([disabled])';

async function rolled(element) {
  for (let at = 0; at < 40 && element.table.view.state.dice === null && !element.table.view.result; at += 1) await tick();
}

async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await rolled(one);
  const [s, o] = one.table.view.mySide === 0 ? [one, two] : [two, one];
  return { a, b, one, two, s, o };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.useRealTimers();
  delete globalThis.ft;
});

const randomBytes = (random) => () => Uint8Array.from({ length: 32 }, () => Math.floor(random() * 256));

async function alone(records, kept) {
  const core = fakeCore({ records });
  globalThis.ft = { store: { get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true) } };
  const element = await phone(core, { live: false, solo: true });
  return { core, element };
}

async function think(element) {
  await vi.advanceTimersByTimeAsync(TIMING.think);
  await tick();
}

describe("Backgammon against the phone", () => {
  it("rolls with the phone, which still reveals its seed after the game is closed and opened again, and plays the match out", async () => {
    const records = new Map();
    const kept = new Map();
    const first = await alone(records, kept);
    first.element.table.timing.unseen = TIMING.think;
    first.element.table.random = () => new Uint8Array(32).fill(1);
    await touch(first.element, '[data-kit="new"]');
    first.element.table.random = randomBytes(seeded(31));
    await think(first.element);
    await tick();
    expect(first.element.table.record.game.moves.map((one) => one[0])).toEqual(["c", "s"]);
    expect(first.element.table.view.myTurn).toBe(false);
    first.element.table.stopTimers();
    first.element.remove();

    const second = await alone(records, kept);
    second.element.table.random = randomBytes(seeded(32));
    await touch(second.element, '[data-kit="enter"]');
    await think(second.element);
    expect(second.element.table.view.state.dice).toHaveLength(2);
    expect(second.element.table.record.game.moves[2]).toBe(`r${second.element.table.record.solo.memory.seed}`);
    for (let step = 0; step < 3000 && second.element.table.view.phase === "play"; step += 1) {
      const node = second.element.table.view.myTurn ? second.element.querySelector(LIVE) : null;
      if (node) {
        node.click();
        await tick();
      } else await think(second.element);
    }
    const { phase, result } = second.element.table.view;
    expect(phase).toBe("over");
    expect(["single", "gammon", "backgammon"]).toContain(result.result.reason);
    expect(text(second.element)).toMatch(/You (won|lost)/);
    expect(second.element.querySelector('.ftg-bar canvas[data-side="them"]').dataset.who).toBe("flick");
    expect(second.element.querySelector('[data-kit="send"]')).toBeNull();
    for (const core of [first.core, second.core]) expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);
});

describe("the pace of the phone in Backgammon", () => {
  it("rolls at once and pauses only before each checker it moves, so its turn takes a pause per checker", async () => {
    const { element } = await alone(new Map(), new Map());
    element.table.random = () => new Uint8Array(32).fill(0);
    await touch(element, '[data-kit="new"]');
    element.table.random = randomBytes(seeded(7));
    const ready = () => element.table.view.phase !== "play" || (element.table.view.myTurn && element.table.view.state.dice !== null);
    for (let at = 0; at < 50 && !ready(); at += 1) await tick();
    expect(element.table.view.myTurn).toBe(true);
    let last = null;
    while (element.table.view.phase === "play" && element.table.view.myTurn) {
      const before = { index: element.table.record.game.moves.length, at: Date.now() };
      element.querySelector(LIVE).click();
      await tick();
      if (element.table.record.game.moves.length > before.index) last = before;
    }
    while (!ready() && Date.now() - last.at < 10_000) await vi.advanceTimersByTimeAsync(10);
    const waited = Date.now() - last.at;
    const phone = element.table.record.game.moves.slice(last.index + 1);
    const shown = phone.filter((move) => /^[mx]/.test(move)).length;
    expect(phone.filter((move) => /^[cr]/.test(move)).length).toBeGreaterThanOrEqual(2);
    expect(shown).toBeGreaterThan(0);
    expect(waited).toBeGreaterThanOrEqual(shown * TIMING.think);
    expect(waited).toBeLessThan(shown * TIMING.think + 100);
  });
});

describe("Backgammon between two phones", () => {
  it("tosses the coin, rolls the dice between the two phones on its own, and shows a move the same on both", async () => {
    const { a, b, s, o } = await match();
    expect(kinds(a).slice(0, 3)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b).slice(0, 3)).toEqual(["sync", "seed", "sync"]);
    const moves = s.table.record.game.moves;
    expect(moves.slice(0, 3).map((move) => move[0])).toEqual(["c", "s", "r"]);
    expect(s.table.view.state.dice).toHaveLength(2);
    expect(o.table.record.game.moves).toEqual(moves);
    expect(text(s)).toContain("Your turn");
    expect(s.querySelectorAll("[data-from]").length).toBeGreaterThan(0);
    expect(o.querySelectorAll("[data-from]")).toHaveLength(0);
    await touch(s, LIVE);
    await touch(s, LIVE);
    expect(s.table.record.game.moves.length).toBe(4);
    expect(s.table.record.game.moves[3]).toMatch(/^m/);
    expect(o.table.record.game.moves).toEqual(s.table.record.game.moves);
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { s, o } = await match();
    const send = s.ft.live.send;
    s.ft.live.send = vi.fn(async () => false);
    await touch(s, LIVE);
    await touch(s, LIVE);
    expect(text(s)).toContain("The other phone cannot be reached right now.");
    expect(o.table.record.game.moves).toHaveLength(3);
    s.ft.live.send = send;
    await touch(s, '[data-kit="back"]');
    await touch(s, '[data-kit="enter"]');
    await tick();
    expect(o.table.record.game.moves).toHaveLength(4);
  });

  it("rolls the dice again before every turn, both sides moving, until one gives up and the other sends the result", async () => {
    const { s, o } = await match();
    let rolls = s.table.view.state.rolls;
    for (let at = 0; at < 400 && s.table.view.state.rolls < 6; at += 1) {
      await rolled(s);
      const side = s.table.view.myTurn ? s : o;
      const node = side.querySelector(LIVE);
      if (node) node.click();
      await tick();
      if (s.table.view.state.rolls > rolls) {
        rolls = s.table.view.state.rolls;
        expect(s.table.record.game.moves.slice(-3).map((move) => move[0])).toEqual(["c", "s", "r"]);
      }
    }
    expect(s.table.view.state.rolls).toBeGreaterThanOrEqual(6);
    expect(o.table.record.game.moves).toEqual(s.table.record.game.moves);
    const mover = s.table.view.myTurn ? s : o;
    const other = mover === s ? o : s;
    await touch(other, '[data-kit="resign"]');
    await touch(other, '[data-kit="yes"]');
    expect(text(mover)).toContain("You won");
    await touch(mover, '[data-kit="send"]');
    expect(mover.ft.say).toHaveBeenCalledWith(expect.stringContaining("🎲 Backgammon"));
  }, 60_000);

  it("ends the round on a resignation", async () => {
    const { s, o } = await match();
    await touch(o, '[data-kit="resign"]');
    await touch(o, '[data-kit="yes"]');
    expect(text(o)).toContain("You lost");
    expect(text(s)).toContain("You won");
  });
});
