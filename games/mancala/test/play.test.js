// Two phones playing mancala against the fake core, by touch, as people would: the coin, a sowing
// seen the same on both sides and the turn again on a seed in the store, a move made with no
// connection that goes with the next hello, and a resignation that sends the result.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-mancala")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const pit = (element, index) => element.querySelector(`[data-pit="${index}"]`);
const move = (element, n) => element.querySelector(`[data-move="${n}"]`);
const store = (element, side) => element.querySelector(`[data-store="${side}"]`);

async function phone(core, opening = {}) {
  const element = document.createElement("ft-mancala");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? move(element, target) : element.querySelector(target);
  if (!node) throw new Error(`nothing to touch: ${target}`);
  node.click();
  await tick();
}

/** Two phones in a match, the coin tossed: `s` plays side 0 (it starts), `n` side 1. */
async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await tick();
  const [s, n] = one.table.view.myTurn ? [one, two] : [two, one];
  return { a, b, one, two, s, n };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("mancala between two phones", () => {
  it("tosses the coin, sows seeds seen on both phones with the turn again on a store, and sends the result of a resignation", async () => {
    const { a, b, s, n } = await match();
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(text(s)).toContain("The coin says you start");
    expect(move(n, 0).disabled).toBe(true);

    // Pit 3 (the board's 2): four seeds end in the store, so side 0 moves again.
    await touch(s, 2);
    for (const side of [s, n]) {
      expect(pit(side, 2).textContent).toContain("0");
      expect(store(side, 0).textContent).toBe("1");
    }
    expect(text(s)).toContain("Your turn");
    await touch(s, 0);
    expect(text(n)).toContain("Your turn");
    expect(pit(n, 1).getAttribute("aria-label")).toBe("Their pit 2: 5 seeds");

    await touch(n, '[data-kit="resign"]');
    await touch(n, '[data-kit="yes"]');
    expect(text(n)).toContain("You lost");
    expect(text(s)).toContain("You won");
    await touch(s, '[data-kit="send"]');
    expect(s.ft.say).toHaveBeenCalledWith(expect.stringContaining("🫘 Mancala"));
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { s, n } = await match();
    const send = s.ft.live.send;
    s.ft.live.send = vi.fn(async () => false);
    await touch(s, 0);
    expect(text(s)).toContain("The other phone cannot be reached right now.");
    expect(pit(s, 0).querySelector(".fmc-clock")).not.toBeNull();
    expect(n.table.record.game.moves).toEqual([]);
    s.ft.live.send = send;
    await touch(s, '[data-kit="back"]');
    await touch(s, '[data-kit="enter"]');
    await tick();
    expect(n.table.record.game.moves).toEqual([0]);
    expect(pit(n, 0).getAttribute("aria-label")).toBe("Their pit 1: 0 seeds");
    expect(pit(s, 0).querySelector(".fmc-clock")).toBeNull();
    expect(text(n)).toContain("Your turn");
  });
});
