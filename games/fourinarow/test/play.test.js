// Two phones playing Four in a Row against the fake core, by touch, as people would: the coin, a
// whole round to a win and the next one to a draw, a move made with no connection that goes with
// the next hello, one side closing the game and coming back, and a move into a full column that
// the other phone claims.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KV, PROTOCOL, fromBase64, seal } from "../../../kit/src/envelope.js";
import { fakeCore, phones, settle, within } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-fourinarow")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const column = (element, index) => element.querySelector(`[data-col="${index}"]`);
const slot = (element, cell) => element.querySelector(`[data-cell="${cell}"]`);
const discs = (element, side) => element.querySelectorAll(`.ffr-col svg.ffr-s${side}`).length;

/** A full board where nobody has four, in the order the two sides fill it (see rules.test.js). */
const DRAW = [0, 1, 0, 1, 0, 0, 2, 0, 2, 0, 2, 1, 1, 1, 3, 1, 3, 2, 2, 4, 2, 4, 3, 3, 5, 3, 5, 3, 5, 4, 4, 5, 6, 5, 6, 5, 6, 6, 4, 6, 4, 6];

async function phone(core, opening = {}) {
  const element = document.createElement("ft-fourinarow");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, target) {
  const node = typeof target === "number" ? column(element, target) : within(element, target);
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

describe("Four in a Row between two phones", () => {
  it("tosses the coin in three messages, plays a round to a win and the next to a draw, and sends the result", async () => {
    const { a, b, x, o } = await match();
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(text(x)).toContain("The coin says you start");
    expect(text(o)).toContain("The coin says they start");
    expect(column(o, 3).disabled).toBe(true);
    expect(column(x, 3).disabled).toBe(false);

    // Side 0 fills column 3, side 1 column 4: four down column 3.
    for (const [who, index] of [[x, 3], [o, 4], [x, 3], [o, 4], [x, 3], [o, 4], [x, 3]]) await touch(who, index);
    for (const side of [x, o]) {
      expect(discs(side, 0)).toBe(4);
      expect(discs(side, 1)).toBe(3);
      expect([...side.querySelectorAll(".ffr-slot.win")].map((one) => Number(one.dataset.cell))).toEqual([17, 24, 31, 38]);
      expect(column(side, 0).disabled).toBe(true);
    }
    expect(text(x)).toContain("You won");
    expect(text(o)).toContain("You lost");

    // The next round: the other person starts it, with side 0; it ends with the board full.
    await touch(o, '[data-kit="again"]');
    expect(text(o)).toContain("Round 2 · Your turn");
    expect(o.querySelectorAll(".ffr-col svg")).toHaveLength(0);
    let who = o;
    for (const index of DRAW) {
      await touch(who, index);
      who = who === o ? x : o;
    }
    expect(text(x)).toContain("Draw");
    expect(discs(x, 0) + discs(x, 1)).toBe(42);
    expect(x.table.view.score).toEqual({ me: 1, them: 0, draws: 1 });
    expect(o.table.view.score).toEqual({ me: 0, them: 1, draws: 1 });

    await touch(x, '[data-kit="send"]');
    expect(x.ft.say).toHaveBeenCalledWith("🔴 Four in a Row: a draw, 1–0 · draws: 1");
    // Everything was saved before the result went out: the plugin closes with `say`.
    const kept = JSON.parse((x.ft === a.ft ? a : b).records.get(`game/${(x.ft === a.ft ? a : b).chat}/${x.table.record.id}`));
    expect(kept.game.moves).toHaveLength(7 + 1 + 42);
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { x, o } = await match();
    // No connection: the core answers false.
    const send = x.ft.live.send;
    x.ft.live.send = vi.fn(async () => false);
    await touch(x, 2);
    expect(text(x)).toContain("The other phone cannot be reached right now.");
    expect(slot(x, 37).querySelector(".ffr-clock")).not.toBeNull();
    expect(o.table.record.game.moves).toEqual([]);
    // Back: the user goes in again, the hello carries the move.
    x.ft.live.send = send;
    await touch(x, '[data-kit="back"]');
    await touch(x, '[data-kit="enter"]');
    await tick();
    expect(o.table.record.game.moves).toEqual([2]);
    expect(column(o, 2).getAttribute("aria-label")).toBe("Column 3: X");
    expect(slot(x, 37).querySelector(".ffr-clock")).toBeNull();
    expect(text(o)).toContain("Your turn");
  });

  it("goes on by itself when the side that closed the game opens it again", async () => {
    const { a, b, x, o } = await match();
    const [xCore, oCore] = x.ft === a.ft ? [a, b] : [b, a];
    // The second person closes the game: the frame is gone, nothing goes in or out of it.
    oCore.closed = true;
    oCore.wire = () => {};
    o.table.stopTimers();
    o.remove();
    await touch(x, 3);
    await vi.advanceTimersByTimeAsync(8_100);
    expect(text(x)).toContain("The other person does not have “Four in a Row” open in this conversation.");
    expect(slot(x, 38).querySelector(".ffr-clock")).not.toBeNull();

    // They open it again, on its list, with what their phone kept.
    const back = fakeCore({ records: oCore.records });
    xCore.wire = (data) => setTimeout(() => back.hear(data), 0);
    back.wire = (data) => setTimeout(() => xCore.hear(data), 0);
    const again = await phone(back);
    expect(again.table.screen).toBe("list");
    expect(back.sent).toEqual([]);
    // The waiting side says hello again on its own; the match opens there with the move in it.
    await vi.advanceTimersByTimeAsync(15_000);
    await tick();
    expect(again.table.screen).toBe("match");
    expect(column(again, 3).getAttribute("aria-label")).toBe("Column 4: X");
    expect(text(x)).not.toContain("does not have");
    expect(slot(x, 38).querySelector(".ffr-clock")).toBeNull();
    await touch(again, 3);
    expect(column(x, 3).getAttribute("aria-label")).toBe("Column 4: X, O");
  });

  it("refuses a move into a full column, whatever the other phone says", async () => {
    const { a, b, x, o } = await match();
    const xCore = x.ft === a.ft ? a : b;
    for (const [who, index] of [[x, 0], [o, 0], [x, 0], [o, 0], [x, 0], [o, 0], [x, 1]]) await touch(who, index);
    expect(column(o, 0).disabled).toBe(true);
    // A phone that claims the second person dropped a seventh disc into column 1.
    const forged = structuredClone(o.table.record.game);
    forged.moves.push(0);
    const message = { p: PROTOCOL, kv: KV, g: "fourinarow", gv: 1, k: "state", doc: x.table.record.id, who: o.table.record.me, app: "1.0.0", game: forged };
    await xCore.hear(seal(message));
    await tick();
    expect(text(x)).toContain("The other phone sent a move that breaks the rules. It was not applied.");
    expect(x.table.record.game.moves).toEqual([0, 0, 0, 0, 0, 0, 1]);
    expect(column(x, 0).getAttribute("aria-label")).toBe("Column 1: X, O, X, O, X, O");
  });
});
