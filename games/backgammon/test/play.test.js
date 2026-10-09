// Two phones playing Backgammon against the fake core, by touch, as people would: the coin, the
// dice rolled by both on their own, a checker moved and seen the same on both sides, a move made
// with no connection that goes with the next hello, a whole round, and a resignation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle, within } from "../../../kit/test/helpers.js";
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

/** The first thing the side may do, as the screenshots tap it: a destination, a checker, the pass. */
const LIVE = '.fbg [data-to], .fbg [data-from]:not([disabled]), .fbg [data-act="pass"]:not([disabled])';

/** Waits for the dice of the side to move to be rolled (three messages across). */
async function rolled(element) {
  for (let at = 0; at < 40 && element.table.view.state.dice === null && !element.table.view.result; at += 1) await tick();
}

/** Two phones in a match, the coin tossed and the first dice rolled: `s` (the starter) to move. */
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
afterEach(() => vi.useRealTimers());

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
    // The starter moves a checker: a point, then a destination.
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
    // Six turns: each one rolled by commitment, seed and reveal, then the checkers moved by taps.
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
