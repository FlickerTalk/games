import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, seeded, settle, within } from "../../../kit/test/helpers.js";
import { feedback } from "../src/rules.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-wordduel")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");

async function phone(core, opening = {}) {
  const element = document.createElement("ft-wordduel");
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

async function type(element, name, value) {
  const field = element.querySelector(`[name="${name}"]`);
  if (!field) throw new Error(`no field ${name}`);
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}

async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await tick();
  const [s, o] = one.table.view.myTurn ? [one, two] : [two, one];
  await type(s, "secret", "crane");
  await touch(s, '[data-act="commit"]');
  expect(text(s)).toContain("Waiting for the other side's word");
  await type(o, "secret", "eagle");
  await touch(o, '[data-act="commit"]');
  return { a, b, one, two, s, o };
}

async function guess(element, word) {
  await type(element, "guess", word);
  await touch(element, '[data-act="guess"]');
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
const LIVE = '.fwd.empty [data-act="suggest"]:not([disabled]), .fwd [data-act="commit"]:not([disabled]), .fwd [data-act="guess"]:not([disabled])';

async function alone(records, kept) {
  const core = fakeCore({ records });
  globalThis.ft = { store: { get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true) } };
  const element = await phone(core, { live: false, solo: true, lang: "es" });
  return { core, element };
}

async function think(element) {
  await vi.advanceTimersByTimeAsync(TIMING.think);
  await tick();
}

async function turn(element) {
  const node = element.table.view.myTurn ? element.querySelector(LIVE) : null;
  if (node) {
    node.click();
    await tick();
  } else await think(element);
}

describe("Word Duel against the phone", () => {
  it("plays a round in the user's language with the phone, closed and opened again halfway, and both words check out", async () => {
    const records = new Map();
    const kept = new Map();
    const first = await alone(records, kept);
    first.element.table.random = () => new Uint8Array(32).fill(1);
    await touch(first.element, '[data-kit="new"]');
    first.element.table.random = randomBytes(seeded(41));
    await think(first.element);
    expect(first.element.table.view.state.lang).toBe("es");
    while (first.element.table.view.round.moves.length < 5) await turn(first.element);
    const memory = first.element.table.record.solo.memory;
    expect(memory).toEqual({ word: expect.any(String), salt: expect.any(String) });
    first.element.table.stopTimers();
    first.element.remove();

    const second = await alone(records, kept);
    second.element.table.random = randomBytes(seeded(42));
    await touch(second.element, '[data-kit="enter"]');
    expect(second.element.table.record.solo.memory).toEqual(memory);
    for (let step = 0; step < 200 && second.element.table.view.phase === "play"; step += 1) await turn(second.element);
    const { phase, state, result, mySide } = second.element.table.view;
    expect(phase).toBe("over");
    expect(state.reveals.map((reveal) => reveal.ok)).toEqual([true, true]);
    expect(state.reveals[1 - mySide].word).toBe(memory.word);
    expect(["solved", "tie", "nobody"]).toContain(result.result.reason);
    for (const core of [first.core, second.core]) expect(core.ft.live.send).not.toHaveBeenCalled();
  });
});

describe("Word Duel between two phones", () => {
  it("tosses the coin, sets both words, and shows each guess with its answer the same on both phones", async () => {
    const { a, b, s, o } = await match();
    expect(kinds(a).slice(0, 3)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b).slice(0, 3)).toEqual(["sync", "seed", "sync"]);
    expect(s.table.record.game.moves).toHaveLength(2);
    expect(text(s)).toContain("Your turn");
    await guess(s, "stare");
    expect(text(o)).toContain("Your turn");
    await guess(o, "about");
    expect(o.table.record.game.moves.slice(2)).toEqual([">stare", `${feedback("stare", "eagle")}>about`]);
    expect(s.table.record.game.moves).toEqual(o.table.record.game.moves);
    const myRow = s.querySelectorAll(".fwd-grid:not(.small) .fwd-row")[0];
    expect([...myRow.querySelectorAll(".fwd-tile")].map((tile) => tile.className.includes(" g")).filter(Boolean)).toHaveLength(1);
  });

  it("keeps a guess made without a connection pending, and sends it with the next hello", async () => {
    const { s, o } = await match();
    const send = s.ft.live.send;
    s.ft.live.send = vi.fn(async () => false);
    await guess(s, "stare");
    expect(text(s)).toContain("The other phone cannot be reached right now.");
    expect(o.table.record.game.moves).toHaveLength(2);
    s.ft.live.send = send;
    await touch(s, '[data-kit="back"]');
    await touch(s, '[data-kit="enter"]');
    await tick();
    expect(o.table.record.game.moves).toHaveLength(3);
    expect(text(o)).toContain("Your turn");
  });

  it("plays a round to its end: the starter guesses in two, the other does not, both reveal", async () => {
    const { s, o } = await match();
    await guess(s, "stare");
    await guess(o, "about");
    await guess(s, "eagle");
    await guess(o, "other");
    await tick();
    await tick();
    expect(text(s)).toContain("You won");
    expect(text(s)).toContain("Guessed in fewer tries");
    expect(text(o)).toContain("You lost");
    expect(text(o)).toContain("Their word was CRANE");
    expect(text(s)).toContain("Their word was EAGLE");
    expect(s.table.record.game.moves.at(-1)).toMatch(/^r/);
    await touch(s, '[data-kit="send"]');
    expect(s.ft.say).toHaveBeenCalledWith(expect.stringContaining("🔤 Word Duel"));
  });

  it("ends the round on a resignation", async () => {
    const { s, o } = await match();
    await touch(o, '[data-kit="resign"]');
    await touch(o, '[data-kit="yes"]');
    expect(text(o)).toContain("You lost");
    expect(text(s)).toContain("You won");
  });
});
