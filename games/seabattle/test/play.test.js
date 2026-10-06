// Two phones playing Sea Battle against the fake core, by touch, as people would: the coin, each
// fleet placed and committed, shots answered honestly and seen the same on both sides, a shot made
// with no connection that goes with the next hello, a whole round to its end, and a resignation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle } from "../../../kit/test/helpers.js";
import { DEFAULT_FLEET, shipCells } from "../src/rules.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-seabattle")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const cell = (element, index) => element.querySelector(`[data-cell="${index}"]`);

async function phone(core, opening = {}) {
  const element = document.createElement("ft-seabattle");
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
  await tick();
}

/** Fires at a cell: one tap on it, one on the ghost. */
async function fire(element, index) {
  await touch(element, index);
  await touch(element, ".fsb-ghost");
}

/** Two phones in a match, the coin tossed and both fleets (the default one) committed: `s` starts. */
async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await tick();
  const [s, o] = one.table.view.myTurn ? [one, two] : [two, one];
  await touch(s, '[data-act="ready"]');
  expect(text(s)).toContain("Waiting for the other fleet");
  await touch(o, '[data-act="ready"]');
  return { a, b, one, two, s, o };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("Sea Battle between two phones", () => {
  it("tosses the coin, places both fleets, and shows each shot and its answer the same on both phones", async () => {
    const { a, b, s, o } = await match();
    expect(kinds(a).slice(0, 3)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b).slice(0, 3)).toEqual(["sync", "seed", "sync"]);
    expect(s.table.record.game.moves).toHaveLength(2);
    expect(text(s)).toContain("Your turn");
    expect(cell(o, 11).disabled).toBe(true);

    // The starter fires at 11, a cell of the other's (default) fleet: the other answers "hit".
    await fire(s, 11);
    expect(text(o)).toContain("Your turn");
    expect(o.querySelector(".fsb-bottom .fsb-cell.ship.last")).not.toBeNull();
    await fire(o, 0);
    expect(o.table.record.game.moves.slice(2)).toEqual([">11", "h>0"]);
    for (const side of [s, o]) expect(side.table.record.game.moves).toEqual(s.table.record.game.moves);
    expect(cell(s, 11).classList.contains("hit")).toBe(true);
    expect(cell(s, 11).getAttribute("aria-label")).toBe("Row 2, column 2: hit");
    // The starter's own sea shows the shot at 0; its answer (a miss) goes out with the next shot.
    expect(s.querySelector(".fsb-bottom .fsb-cell.last")).not.toBeNull();
    expect(s.querySelector(".fsb-bottom .fsb-cell.miss")).toBeNull();
    await fire(s, 12);
    expect(s.table.record.game.moves.at(-1)).toBe("m>12");
    expect(s.querySelector(".fsb-bottom .fsb-cell.miss")).not.toBeNull();
    expect(o.querySelector(".fsb-sea.big .fsb-cell.miss")).not.toBeNull();
  });

  it("keeps a shot made without a connection pending, and sends it with the next hello", async () => {
    const { s, o } = await match();
    const send = s.ft.live.send;
    s.ft.live.send = vi.fn(async () => false);
    await fire(s, 11);
    expect(text(s)).toContain("The other phone cannot be reached right now.");
    expect(cell(s, 11).querySelector(".fsb-clock")).not.toBeNull();
    expect(o.table.record.game.moves).toHaveLength(2);
    s.ft.live.send = send;
    await touch(s, '[data-kit="back"]');
    await touch(s, '[data-kit="enter"]');
    await tick();
    expect(o.table.record.game.moves).toHaveLength(3);
    expect(text(o)).toContain("Your turn");
  });

  it("sinks the whole fleet, reveals both, and gives the round to the starter", async () => {
    const { s, o } = await match();
    const targets = DEFAULT_FLEET.flatMap(shipCells);
    const water = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 17, 18, 19, 20, 21];
    for (let at = 0; at < targets.length; at += 1) {
      await fire(s, targets[at]);
      if (at < targets.length - 1) await fire(o, water[at]);
    }
    // The last shot sank the last ship: the other phone answers on its own, both reveal, done.
    await tick();
    await tick();
    expect(text(s)).toContain("You won");
    expect(text(s)).toContain("The whole fleet was sunk");
    expect(text(o)).toContain("You lost");
    expect(s.table.record.game.moves.at(-1)).toMatch(/^r/);
    expect(s.querySelectorAll(".fsb-sea.big .fsb-cell.sunk")).toHaveLength(17);
    await touch(s, '[data-kit="send"]');
    expect(s.ft.say).toHaveBeenCalledWith(expect.stringContaining("🚢 Sea Battle"));
  });

  it("ends the round on a resignation", async () => {
    const { s, o } = await match();
    await touch(o, '[data-kit="resign"]');
    await touch(o, '[data-kit="yes"]');
    expect(text(o)).toContain("You lost");
    expect(text(s)).toContain("You won");
  });
});
