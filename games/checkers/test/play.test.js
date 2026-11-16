import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, settle, within } from "../../../kit/test/helpers.js";
import { legalMoves } from "../src/rules.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-checkers")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const square = (element, index) => element.querySelector(`button[data-cell="${index}"]`);
const pieces = (element, side) => [...element.querySelectorAll("button[data-cell]")].filter((one) => (side ? /: light (piece|king)$/ : /: dark (piece|king)$/).test(one.getAttribute("aria-label"))).length;
const marked = (element, name) => [...element.querySelectorAll("button[data-mark]")].filter((one) => one.dataset.mark.split(" ").includes(name)).map((one) => one.dataset.cell);

async function phone(core, opening = {}) {
  const element = document.createElement("ft-checkers");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? square(element, target) : within(element, target);
  if (!node) throw new Error(`nothing to touch: ${target}`);
  node.click();
  await tick();
}

async function move(element, ...squares) {
  for (const one of squares) await touch(element, one);
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

describe("checkers against the phone", () => {
  it("lets the phone move its pieces by the rules, in the conversation, without a word on the live channel", async () => {
    const core = fakeCore();
    const one = await phone(core, { live: false, solo: true });
    one.table.random = () => new Uint8Array(32).fill(1);
    await touch(one, '[data-kit="new"]');
    await vi.advanceTimersByTimeAsync(TIMING.think);
    await tick();
    expect(one.table.record.game.moves).toHaveLength(1);
    expect(pieces(one, 0)).toBe(12);
    const mine = legalMoves(one.table.view.state, one.table.view.mySide)[0];
    await move(one, ...mine.split("-").map(Number));
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
      if (one.table.view.myTurn) await move(one, ...legalMoves(one.table.view.state, one.table.view.mySide)[0].split("-").map(Number));
      await vi.advanceTimersByTimeAsync(TIMING.think);
      await tick();
    }
    expect(one.table.view.phase).toBe("over");
    expect(text(one)).toMatch(/You (won|lost)|Draw/);
    expect(one.querySelector('.ftg-bar canvas[data-side="them"]').dataset.who).toBe("flick");
    expect(one.querySelector('[data-kit="send"]')).toBeNull();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);
});

describe("checkers between two phones", () => {
  it("tosses the coin, shows a capture the same on both phones, and sends the result of a resignation", async () => {
    const { a, b, d, l } = await match();
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(text(d)).toContain("The coin says you start");
    expect(square(l, 17).disabled).toBe(true);
    expect(square(d, 17).disabled).toBe(false);

    await move(d, 17, 24);
    expect(text(l)).toContain("Your turn");
    await move(l, 42, 33);
    expect(marked(d, "can")).toEqual(["24"]);
    await move(d, 24, 42);
    for (const side of [d, l]) {
      expect(pieces(side, 0)).toBe(12);
      expect(pieces(side, 1)).toBe(11);
      expect(square(side, 33).getAttribute("aria-label")).toBe("Row 5, column 2: empty");
      expect(square(side, 42).getAttribute("aria-label")).toBe("Row 6, column 3: dark piece");
    }

    await touch(l, '[data-kit="resign"]');
    await touch(l, '[data-kit="yes"]');
    expect(text(l)).toContain("You lost");
    expect(text(d)).toContain("You won");
    await touch(d, '[data-kit="send"]');
    expect(d.ft.say).toHaveBeenCalledWith(expect.stringContaining("🔘 Checkers"));
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { d, l } = await match();
    const send = d.ft.live.send;
    d.ft.live.send = vi.fn(async () => false);
    await move(d, 21, 30);
    expect(text(d)).toContain("The other phone cannot be reached right now.");
    expect(marked(d, "pending")).toEqual(["30"]);
    expect(l.table.record.game.moves).toEqual([]);
    d.ft.live.send = send;
    await touch(d, '[data-kit="back"]');
    await touch(d, '[data-kit="enter"]');
    await tick();
    expect(l.table.record.game.moves).toEqual(["21-30"]);
    expect(square(l, 30).getAttribute("aria-label")).toBe("Row 4, column 7: dark piece");
    expect(marked(d, "pending")).toEqual([]);
    expect(text(l)).toContain("Your turn");
  });
});
