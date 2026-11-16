import { describe, expect, it } from "vitest";
import { shapes } from "../../../kit/test/canvas/recorder.js";
import { card } from "../src/card.js";
import { play } from "../src/war.js";
import { warView } from "../src/war-view.js";
import { SIZES, inside, keyed, painted, playing, seat } from "./rig.js";

const [NINE, KING, TWO] = [card(1, 8), card(2, 12), card(0, 1)];
const table = (extra = {}) => ({ piles: [[1, 2, 3, NINE], [14, 15, 16, KING]], pot: [[], []], open: [[], []], up: [null, null], war: false, battles: 4, last: null, ...extra });
const state = (extra, next = 1) => playing("war", table(extra), next);
const after = (before, side) => ({ ...before, ...play(before.table, "f", side) });

describe("the War table", () => {
  it("gives the user their own pile to touch, at least 44 px, and names both piles, at every size", () => {
    for (const size of SIZES) {
      const at = seat(warView, state(), { size });
      const all = warView.buttons(at);
      expect(all.map((one) => one.key)).toEqual(["mine", "theirs"]);
      for (const { box } of all) {
        expect(inside(box), `${size}`).toBe(true);
        expect(box.w * size).toBeGreaterThanOrEqual(44);
        expect(box.h * size).toBeGreaterThanOrEqual(44);
      }
      expect(keyed(all, "mine")).toMatchObject({ label: "Turn your top card (4 left)", disabled: false });
      expect(keyed(all, "theirs")).toMatchObject({ label: "Their pile: 4 cards", disabled: true });
    }
    expect(warView.label(seat(warView, state()))).toBe("Card Corner, War: Battle 5 of 40 · Your pile: 4 cards · Their pile: 4 cards");
  });

  it("turns the user's card on a touch of their pile, on their turn only", () => {
    const at = seat(warView, state());
    warView.press("mine", at);
    expect(at.ctx.play).toHaveBeenCalledWith("f");
    warView.press("theirs", at);
    expect(at.ctx.play).toHaveBeenCalledTimes(1);
    const waiting = seat(warView, state({}, 0));
    expect(keyed(warView.buttons(waiting), "mine").disabled).toBe(true);
    warView.press("mine", waiting);
    expect(waiting.ctx.play).not.toHaveBeenCalled();
  });

  it("names the cards turned up on the table, and keeps the last battle there until the next card is turned", () => {
    const mine = after(state(), 1);
    const both = after(mine, 0);
    expect(both.table.last.winner).toBe(1);
    const at = seat(warView, both);
    expect(keyed(warView.buttons(at), "table")).toMatchObject({ label: "Your card: king of diamonds · Their card: 9 of hearts", disabled: true });
    const shown = painted(warView, at);
    expect(shown.keys.filter((key) => key.startsWith("f")).sort()).toEqual([`f${KING}`, `f${NINE}`].sort());
    const next = painted(warView, seat(warView, after(both, 1)));
    expect(next.keys.filter((key) => key.startsWith("f"))).toEqual([`f${both.table.piles[1].at(-1)}`]);
  });

  it("never draws a card still in a pile or laid face down: two tables with other hidden cards are drawn alike", () => {
    const war = { pot: [[NINE, 3, 2, 1], [card(2, 8), 16, 15, 14]], open: [[NINE, 1], [card(2, 8), 14]], up: [1, 14], war: false };
    const one = painted(warView, seat(warView, state({ ...war, piles: [[40, 41, 42], [43, 44, 45]] })));
    const two = painted(warView, seat(warView, state({ ...war, piles: [[45, 44, 43], [42, 41, 40]], pot: [[NINE, 50, 49, 1], [card(2, 8), 48, 47, 14]] })));
    expect(one.keys.filter((key) => key.startsWith("f")).sort()).toEqual([`f${NINE}`, "f1", `f${card(2, 8)}`, "f14"].sort());
    expect(one.keys.filter((key) => key === "back").length).toBeGreaterThanOrEqual(6);
    expect(shapes(one.pen)).toEqual(shapes(two.pen));
    expect(one.drawn).toEqual(two.drawn);
    expect(one.pen.depth).toBe(0);
  });

  it("writes the piles and the battles played in digits", () => {
    const { pen } = painted(warView, seat(warView, state()));
    expect(pen.calls.filter((call) => call.op === "fillText").map((call) => call.text)).toEqual(expect.arrayContaining(["4", "40"]));
  });

  it("brings each new card from its pile to the table, face up or face down as it was laid, and sends the last battle to its winner", () => {
    const before = state();
    const mine = after(before, 1);
    const flights = warView.flights(before, mine, "f", 1, 343);
    expect(flights).toHaveLength(1);
    expect(flights[0]).toMatchObject({ card: KING, flip: "up", hide: ["p1:0"] });
    expect(flights[0].from.y).toBeGreaterThan(flights[0].to.y);
    const tie = state({ war: true, pot: [[TWO], [card(3, 1)]], open: [[TWO], [card(3, 1)]] });
    const laid = warView.flights(tie, after(tie, 1), "f", 1, 343);
    expect(laid.map((one) => one.card)).toEqual([null, null, null, 14]);
    const done = after(mine, 0);
    const again = warView.flights(done, after(done, 1), "f", 1, 343);
    expect(again.filter((one) => one.flip === "down")).toHaveLength(2);
    expect(warView.cues(before, mine, "f")).toEqual([{ cue: "card", at: 0 }]);
  });
});
