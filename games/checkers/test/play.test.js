// Two phones playing checkers against the fake core, by touch, as people would: the coin, a
// capture seen the same on both sides, a move made with no connection that goes with the next
// hello, and a resignation that ends the round and sends the result.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-checkers")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const square = (element, index) => element.querySelector(`[data-cell="${index}"]`);
const pieces = (element, side) => element.querySelectorAll(`.fck-sq svg.fck-s${side}`).length;

async function phone(core, opening = {}) {
  const element = document.createElement("ft-checkers");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? square(element, target) : element.querySelector(target);
  if (!node) throw new Error(`nothing to touch: ${target}`);
  node.click();
  await tick();
}

/** A move by touch: the piece, then each square it goes to. */
async function move(element, ...squares) {
  for (const one of squares) await touch(element, one);
}

/** Two phones in a match, the coin tossed: `d` plays the dark pieces (it starts), `l` the light. */
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
    // Dark must now jump over the light man at 33: it is the only move open.
    expect([...d.querySelectorAll(".fck-sq.can")].map((one) => one.dataset.cell)).toEqual(["24"]);
    await move(d, 24, 42);
    for (const side of [d, l]) {
      expect(pieces(side, 0)).toBe(12);
      expect(pieces(side, 1)).toBe(11);
      expect(square(side, 33).getAttribute("aria-label")).toBe("Row 5, column 2: empty");
      expect(square(side, 42).getAttribute("aria-label")).toBe("Row 6, column 3: dark piece");
    }

    // The light side gives up: the dark side wins the round, and says so in the chat.
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
    expect(square(d, 30).querySelector(".fck-clock")).not.toBeNull();
    expect(l.table.record.game.moves).toEqual([]);
    d.ft.live.send = send;
    await touch(d, '[data-kit="back"]');
    await touch(d, '[data-kit="enter"]');
    await tick();
    expect(l.table.record.game.moves).toEqual(["21-30"]);
    expect(square(l, 30).getAttribute("aria-label")).toBe("Row 4, column 7: dark piece");
    expect(square(d, 30).querySelector(".fck-clock")).toBeNull();
    expect(text(l)).toContain("Your turn");
  });
});
