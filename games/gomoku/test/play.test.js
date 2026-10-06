// Two phones playing Five in a Row against the fake core, by touch, as people would: the coin, the
// opening stones seen the same on both sides, a stone placed with no connection that goes with the
// next hello, and a resignation that ends the round and sends the result.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-gomoku")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const cell = (element, index) => element.querySelector(`[data-cell="${index}"]`);
const stones = (element, side) => element.querySelectorAll(`.fgm-cell svg.fgm-s${side}`).length;

async function phone(core, opening = {}) {
  const element = document.createElement("ft-gomoku");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? cell(element, target) : element.querySelector(target);
  if (!node) throw new Error(`nothing to touch: ${target}`);
  node.click();
  await tick();
}

/** A stone is placed in two taps: one on the intersection, one on the ghost it shows. */
async function place(element, index) {
  await touch(element, index);
  await touch(element, ".fgm-ghost");
}

/** Two phones in a match, the coin tossed: `k` plays black (it starts), `w` white. */
async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await tick();
  const [k, w] = one.table.view.myTurn ? [one, two] : [two, one];
  return { a, b, one, two, k, w };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("Five in a Row between two phones", () => {
  it("tosses the coin, shows the same stones on both phones after each move, and sends the result of a resignation", async () => {
    const { a, b, k, w } = await match();
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(text(k)).toContain("The coin says you start");
    expect(cell(w, 112).disabled).toBe(true);
    expect(cell(k, 112).disabled).toBe(false);

    await place(k, 112);
    for (const side of [k, w]) {
      expect(stones(side, 0)).toBe(1);
      expect(stones(side, 1)).toBe(0);
    }
    expect(text(w)).toContain("Your turn");
    await place(w, 113);
    for (const side of [k, w]) expect([stones(side, 0), stones(side, 1)]).toEqual([1, 1]);
    expect(cell(w, 113).classList.contains("last")).toBe(true);
    expect(cell(k, 113).getAttribute("aria-label")).toBe("Row 8, column 9: white");

    // White gives up: black wins the round, and says so in the chat.
    await touch(w, '[data-kit="resign"]');
    await touch(w, '[data-kit="yes"]');
    expect(text(w)).toContain("You lost");
    expect(text(k)).toContain("You won");
    await touch(k, '[data-kit="send"]');
    expect(k.ft.say).toHaveBeenCalledWith(expect.stringContaining("⚫ Five in a Row"));
  });

  it("keeps a stone placed without a connection pending, and sends it with the next hello", async () => {
    const { k, w } = await match();
    const send = k.ft.live.send;
    k.ft.live.send = vi.fn(async () => false);
    await place(k, 112);
    expect(text(k)).toContain("The other phone cannot be reached right now.");
    expect(cell(k, 112).querySelector(".fgm-clock")).not.toBeNull();
    expect(w.table.record.game.moves).toEqual([]);
    k.ft.live.send = send;
    await touch(k, '[data-kit="back"]');
    await touch(k, '[data-kit="enter"]');
    await tick();
    expect(w.table.record.game.moves).toEqual([112]);
    expect(cell(w, 112).getAttribute("aria-label")).toBe("Row 8, column 8: black");
    expect(cell(k, 112).querySelector(".fgm-clock")).toBeNull();
    expect(text(w)).toContain("Your turn");
  });

  it("ends the round by the rules with a line of five, and says so", async () => {
    const { k, w } = await match();
    const line = [112, 113, 97, 114, 96, 130, 98, 145, 95, 160, 99];
    for (const [at, index] of line.entries()) await place(at % 2 ? w : k, index);
    expect(text(k)).toContain("You won");
    expect(text(k)).toContain("Five in a row");
    expect(w.querySelectorAll(".fgm-cell.won")).toHaveLength(5);
  });
});
