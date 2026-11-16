import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, settle, within } from "../../../kit/test/helpers.js";
import { moves } from "../src/rules.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-reversi")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const cell = (element, index) => element.querySelector(`button[data-cell="${index}"]`);
const discs = (element, side) => [...element.querySelectorAll("button[data-cell]")].filter((one) => one.getAttribute("aria-label").endsWith(side ? ": light" : ": dark")).length;
const marked = (element, name) => [...element.querySelectorAll("button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => one.dataset.cell);

async function phone(core, opening = {}) {
  const element = document.createElement("ft-reversi");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? cell(element, target) : within(element, target);
  if (!node) throw new Error(`nothing to touch: ${target}`);
  node.click();
  await tick();
}

async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await tick();
  const [d, l] = one.table.view.myTurn ? [one, two] : [two, one];
  return { a, b, one, two, d, l };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("Reversi against the phone", () => {
  it("lets the phone play by the rules, in the conversation, without a word on the live channel", async () => {
    const core = fakeCore();
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32).fill(1);
    await touch(one, '[data-kit="new"]');
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(one.table.record.game.moves).toHaveLength(1);
    expect(discs(one, 0)).toBe(4);
    await touch(one, moves(one.table.view.state.cells, 1)[0]);
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(one.table.record.game.moves).toHaveLength(3);
    expect(one.table.view.myTurn).toBe(true);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays a whole round against the phone to its end, the phone always Flick and never a word on the live channel", async () => {
    const core = fakeCore();
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32).fill(1);
    await touch(one, '[data-kit="new"]');
    for (let turn = 0; one.table.view.phase === "play" && turn < 200; turn += 1) {
      if (one.table.view.myTurn) await touch(one, moves(one.table.view.state.cells, one.table.view.mySide)[0]);
      await vi.advanceTimersByTimeAsync(TIMING.think);
      await tick();
    }
    expect(one.table.view.phase).toBe("over");
    expect(text(one)).toMatch(/You (won|lost)|Draw/);
    expect(discs(one, 0) + discs(one, 1)).toBeGreaterThan(4);
    expect(one.querySelector('.ftg-bar canvas[data-side="them"]').dataset.who).toBe("flick");
    expect(one.querySelector('[data-kit="send"]')).toBeNull();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });
});

describe("Reversi between two phones", () => {
  it("tosses the coin, shows the same discs on both phones after each move, and sends the result of a resignation", async () => {
    const { a, b, d, l } = await match();
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(text(d)).toContain("The coin says you start");
    expect(cell(l, 19).disabled).toBe(true);
    expect(cell(d, 19).disabled).toBe(false);

    await touch(d, 19);
    for (const side of [d, l]) {
      expect(discs(side, 0)).toBe(4);
      expect(discs(side, 1)).toBe(1);
    }
    expect(text(l)).toContain("Your turn");
    await touch(l, 18);
    for (const side of [d, l]) expect([discs(side, 0), discs(side, 1)]).toEqual([3, 3]);
    expect(marked(l, "last")).toEqual(["18"]);
    expect(marked(d, "last")).toEqual(["18"]);

    await touch(l, '[data-kit="resign"]');
    await touch(l, '[data-kit="yes"]');
    expect(text(l)).toContain("You lost");
    expect(text(d)).toContain("You won");
    await touch(d, '[data-kit="send"]');
    expect(d.ft.say).toHaveBeenCalledWith(expect.stringContaining("⚫ Reversi"));
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { d, l } = await match();
    const send = d.ft.live.send;
    d.ft.live.send = vi.fn(async () => false);
    await touch(d, 19);
    expect(text(d)).toContain("The other phone cannot be reached right now.");
    expect(marked(d, "pending")).toEqual(["19"]);
    expect(l.table.record.game.moves).toEqual([]);
    d.ft.live.send = send;
    await touch(d, '[data-kit="back"]');
    await touch(d, '[data-kit="enter"]');
    await tick();
    expect(l.table.record.game.moves).toEqual([19]);
    expect(cell(l, 19).getAttribute("aria-label")).toBe("Row 3, column 4: dark");
    expect(marked(d, "pending")).toEqual([]);
    expect(text(l)).toContain("Your turn");
  });
});
