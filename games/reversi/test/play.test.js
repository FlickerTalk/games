// Two phones playing Reversi against the fake core, by touch, as people would: the coin, the
// opening moves seen the same on both sides with the discs turned, a move made with no connection
// that goes with the next hello, and a resignation that ends the round and sends the result.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle, within } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-reversi")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const cell = (element, index) => element.querySelector(`[data-cell="${index}"]`);
const discs = (element, side) => element.querySelectorAll(`.frv-cell svg.frv-s${side}`).length;

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

/** Two phones in a match, the coin tossed: `d` plays the dark discs (it starts), `l` the light. */
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
    expect(cell(l, 18).classList.contains("last")).toBe(true);

    // The light side gives up: the dark side wins the round, and says so in the chat.
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
    expect(cell(d, 19).querySelector(".frv-clock")).not.toBeNull();
    expect(l.table.record.game.moves).toEqual([]);
    d.ft.live.send = send;
    await touch(d, '[data-kit="back"]');
    await touch(d, '[data-kit="enter"]');
    await tick();
    expect(l.table.record.game.moves).toEqual([19]);
    expect(cell(l, 19).getAttribute("aria-label")).toBe("Row 3, column 4: dark");
    expect(cell(d, 19).querySelector(".frv-clock")).toBeNull();
    expect(text(l)).toContain("Your turn");
  });
});
