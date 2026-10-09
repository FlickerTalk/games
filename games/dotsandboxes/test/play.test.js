// Two phones playing dots and boxes against the fake core, by touch, as people would: the coin,
// the lines seen the same on both sides, a box closed that gives the turn again, a move made with
// no connection that goes with the next hello, and a resignation that sends the result.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle, within } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-dotsandboxes")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const line = (element, index) => element.querySelector(`[data-line="${index}"]`);
const box = (element, index) => element.querySelector(`[data-box="${index}"]`);

async function phone(core, opening = {}) {
  const element = document.createElement("ft-dotsandboxes");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? line(element, target) : within(element, target);
  if (!node) throw new Error(`nothing to touch: ${target}`);
  node.click();
  await tick();
}

/** Two phones in a match, the coin tossed: `x` plays side 0 (it starts), `o` side 1. */
async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await tick();
  const [x, o] = one.table.view.myTurn ? [one, two] : [two, one];
  return { a, b, one, two, x, o };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("dots and boxes between two phones", () => {
  it("tosses the coin, draws lines seen on both phones, closes a box for another turn, and sends the result of a resignation", async () => {
    const { a, b, x, o } = await match();
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(text(x)).toContain("The coin says you start");
    expect(line(o, 0).disabled).toBe(true);

    await touch(x, 0);
    await touch(o, 4);
    await touch(x, 20);
    expect(text(o)).toContain("Your turn");
    await touch(o, 21);
    for (const side of [x, o]) {
      expect(box(side, 0).classList.contains("b1")).toBe(true);
      expect(line(side, 21).classList.contains("d1")).toBe(true);
    }
    // The box gives the turn again to the one who closed it.
    expect(text(o)).toContain("Your turn");
    expect(line(x, 1).disabled).toBe(true);
    expect(line(o, 1).disabled).toBe(false);

    await touch(o, '[data-kit="resign"]');
    await touch(o, '[data-kit="yes"]');
    expect(text(o)).toContain("You lost");
    expect(text(x)).toContain("You won");
    await touch(x, '[data-kit="send"]');
    expect(x.ft.say).toHaveBeenCalledWith(expect.stringContaining("🔲 Dots and Boxes"));
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { x, o } = await match();
    const send = x.ft.live.send;
    x.ft.live.send = vi.fn(async () => false);
    await touch(x, 5);
    expect(text(x)).toContain("The other phone cannot be reached right now.");
    expect(line(x, 5).querySelector(".fdb-clock")).not.toBeNull();
    expect(o.table.record.game.moves).toEqual([]);
    x.ft.live.send = send;
    await touch(x, '[data-kit="back"]');
    await touch(x, '[data-kit="enter"]');
    await tick();
    expect(o.table.record.game.moves).toEqual([5]);
    expect(line(o, 5).getAttribute("aria-label")).toBe("Line across, row 2, box 2: X");
    expect(line(x, 5).querySelector(".fdb-clock")).toBeNull();
    expect(text(o)).toContain("Your turn");
  });
});
