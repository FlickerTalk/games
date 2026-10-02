// Two phones playing Tic-Tac-Toe against the fake core, by touch, as people would: the coin, a
// whole round to a win and the next one to a draw, a move made with no connection that goes with
// the next hello, one side closing the game and coming back, and a state that breaks the rules.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KV, PROTOCOL, fromBase64, seal } from "../../../kit/src/envelope.js";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-tictactoe")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");
const cell = (element, index) => element.querySelector(`[data-cell="${index}"]`);

async function phone(core, opening = {}) {
  const element = document.createElement("ft-tictactoe");
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

/** Two phones in a match, the coin tossed: `x` plays ✖ (it starts), `o` plays ⭕. */
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

describe("Tic-Tac-Toe between two phones", () => {
  it("tosses the coin in three messages, plays a round to a win and the next to a draw, and sends the result", async () => {
    const { a, b, x, o } = await match();
    expect(kinds(a)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b)).toEqual(["sync", "seed", "sync"]);
    expect(text(x)).toContain("The coin says you start");
    expect(text(o)).toContain("The coin says they start");
    expect(cell(o, 0).disabled).toBe(true);

    // ✖ 0, ⭕ 3, ✖ 1, ⭕ 4, ✖ 2: a row.
    for (const [who, index] of [[x, 0], [o, 3], [x, 1], [o, 4], [x, 2]]) await touch(who, index);
    for (const side of [x, o]) {
      expect(side.querySelectorAll("svg.ftt-x")).toHaveLength(3 + 1); // three marks and the chip
      expect(side.querySelector("svg.ftt-win line")).not.toBeNull();
    }
    expect(text(x)).toContain("You won");
    expect(text(o)).toContain("You lost");

    // The next round: ⭕'s person starts it and plays ✖ now; it ends in a draw.
    await touch(o, '[data-kit="again"]');
    expect(text(o)).toContain("Round 2 · Your turn");
    for (const [who, index] of [[o, 0], [x, 1], [o, 2], [x, 4], [o, 3], [x, 5], [o, 7], [x, 6], [o, 8]]) await touch(who, index);
    expect(text(x)).toContain("Draw");
    expect(x.table.view.score).toEqual({ me: 1, them: 0, draws: 1 });
    expect(o.table.view.score).toEqual({ me: 0, them: 1, draws: 1 });

    await touch(x, '[data-kit="send"]');
    expect(x.ft.say).toHaveBeenCalledWith("⭕ Tic-Tac-Toe: a draw, 1–0 · draws: 1");
    // Everything was saved before the result went out: the plugin closes with `say`.
    const kept = JSON.parse(x.ft === a.ft ? a.records.get(`game/${a.chat}/${x.table.record.id}`) : b.records.get(`game/${b.chat}/${x.table.record.id}`));
    expect(kept.game.moves).toHaveLength(15);
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { x, o } = await match();
    // No connection: the core answers false.
    const send = x.ft.live.send;
    x.ft.live.send = vi.fn(async () => false);
    await touch(x, 4);
    expect(text(x)).toContain("The other phone cannot be reached right now.");
    expect(cell(x, 4).querySelector(".ftt-clock")).not.toBeNull();
    expect(o.table.record.game.moves).toEqual([]);
    // Back: the user goes in again, the hello carries the move.
    x.ft.live.send = send;
    await touch(x, '[data-kit="back"]');
    await touch(x, '[data-kit="enter"]');
    await tick();
    expect(o.table.record.game.moves).toEqual([4]);
    expect(cell(o, 4).getAttribute("aria-label")).toBe("Row 2, column 2: X");
    expect(cell(x, 4).querySelector(".ftt-clock")).toBeNull();
    expect(text(o)).toContain("Your turn");
  });

  it("goes on by itself when the side that closed the game opens it again", async () => {
    const { a, b, x, o } = await match();
    const [xCore, oCore] = x.ft === a.ft ? [a, b] : [b, a];
    // ⭕'s person closes the game: the frame is gone, nothing goes in or out of it.
    oCore.closed = true;
    oCore.wire = () => {};
    o.table.stopTimers();
    o.remove();
    await touch(x, 4);
    await vi.advanceTimersByTimeAsync(8_100);
    expect(text(x)).toContain("The other person does not have “Tic-Tac-Toe” open in this conversation.");
    expect(cell(x, 4).querySelector(".ftt-clock")).not.toBeNull();

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
    expect(cell(again, 4).getAttribute("aria-label")).toBe("Row 2, column 2: X");
    expect(text(x)).not.toContain("does not have");
    expect(cell(x, 4).querySelector(".ftt-clock")).toBeNull();
    await touch(again, 0);
    expect(cell(x, 0).getAttribute("aria-label")).toBe("Row 1, column 1: O");
  });

  it("refuses a state that breaks the rules, whatever the other phone says", async () => {
    const { a, b, x, o } = await match();
    const xCore = x.ft === a.ft ? a : b;
    await touch(x, 4);
    // A phone that claims ⭕ played on ✖'s cell.
    const forged = structuredClone(o.table.record.game);
    forged.moves.push(4);
    const message = { p: PROTOCOL, kv: KV, g: "tictactoe", gv: 1, k: "state", doc: x.table.record.id, who: o.table.record.me, app: "1.0.0", game: forged };
    await xCore.hear(seal(message));
    await tick();
    expect(text(x)).toContain("The other phone sent a move that breaks the rules. It was not applied.");
    expect(x.table.record.game.moves).toEqual([4]);
    expect(cell(x, 4).getAttribute("aria-label")).toBe("Row 2, column 2: X");
  });
});
