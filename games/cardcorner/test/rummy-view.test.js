import { describe, expect, it } from "vitest";
import { shapes } from "../../../kit/test/canvas/recorder.js";
import { card } from "../src/card.js";
import { play } from "../src/rummy.js";
import { rummyView } from "../src/rummy-view.js";
import { SIZES, apart, inside, keyed, painted, playing, seat } from "./rig.js";

const MINE = [card(0, 2), card(0, 3), card(0, 4), card(1, 9), card(2, 9), card(3, 12), card(1, 0)];
const THEIRS = [card(2, 5), card(3, 5), card(1, 5), card(1, 12), card(2, 1), card(3, 7), card(0, 10)];
const table = (extra = {}) => ({ hands: [THEIRS, MINE], stock: [40, 41, 42], discard: [card(3, 9)], melds: [], step: "draw", took: null, turns: 0, ...extra });
const state = (extra, next = 1) => playing("rummy", table(extra), next);
const after = (before, move, side = before.next) => ({ ...before, ...play(before.table, move, side) });
const cards = (list) => list.filter((one) => typeof one.key === "number");

describe("the Rummy table", () => {
  it("lays a button over every card of the hand, the stock and the discard pile, at least 44 px each, inside the board", () => {
    for (const size of SIZES) {
      const at = seat(rummyView, state(), { size });
      const all = rummyView.buttons(at);
      expect(cards(all).map((one) => one.key)).toEqual([...MINE].sort((a, b) => a - b));
      for (const { box, key } of all) {
        expect(inside(box), `${size} ${key}`).toBe(true);
        expect(box.w * size, `${size} ${key}`).toBeGreaterThanOrEqual(43.9);
        expect(box.h * size, `${size} ${key}`).toBeGreaterThanOrEqual(size === 300 ? 36 : 40);
      }
      const hand = cards(all).map((one) => one.box);
      for (const [index, one] of hand.entries()) for (const other of hand.slice(index + 1)) expect(apart(one, other)).toBe(true);
    }
  });

  it("opens the stock and the discard pile to start the turn, and the hand only after a card is taken", () => {
    const at = seat(rummyView, state());
    const all = rummyView.buttons(at);
    expect(keyed(all, "stock")).toMatchObject({ label: "Take a card from the stock (3 left)", disabled: false });
    expect(keyed(all, "discard")).toMatchObject({ label: "Take the 10 of clubs from the discard pile", disabled: false });
    expect(cards(all).every((one) => one.disabled)).toBe(true);
    expect(rummyView.label(at)).toBe("Card Corner, Rummy: Their hand: 7 cards · Discard pile: 10 of clubs · Your hand: 7 cards");
    rummyView.press("stock", at);
    expect(at.ctx.play).toHaveBeenCalledWith("ds");
    rummyView.press("discard", at);
    expect(at.ctx.play).toHaveBeenLastCalledWith("dd");
    const waiting = seat(rummyView, state({}, 0));
    expect(rummyView.buttons(waiting).filter((one) => !one.disabled).map((one) => one.key)).toEqual(["sort"]);
  });

  it("selects cards on a touch, offers to lay them down only when they make a meld, and lays them", () => {
    const at = seat(rummyView, state({ step: "play" }));
    expect(keyed(rummyView.buttons(at), "lay")).toBeUndefined();
    for (const one of [card(0, 2), card(0, 3)]) rummyView.press(one, at);
    expect(at.local.selected).toEqual([card(0, 2), card(0, 3)]);
    expect(keyed(rummyView.buttons(at), card(0, 2))).toMatchObject({ label: "Selected: 3 of spades", data: { mark: "chosen" } });
    expect(keyed(rummyView.buttons(at), "lay")).toBeUndefined();
    rummyView.press(card(0, 4), at);
    expect(keyed(rummyView.buttons(at), "lay")).toMatchObject({ label: "Lay down the selected cards", disabled: false });
    rummyView.press("lay", at);
    expect(at.ctx.play).toHaveBeenCalledWith(`m${card(0, 2)}.${card(0, 3)}.${card(0, 4)}`);
    rummyView.press(card(0, 2), at);
    expect(at.local.selected).toEqual([card(0, 3), card(0, 4)]);
    expect(at.wake).toHaveBeenCalled();
  });

  it("discards the one selected card on a touch of the discard pile, but not the card just taken from it", () => {
    const at = seat(rummyView, state({ step: "play", took: card(1, 9) }));
    expect(keyed(rummyView.buttons(at), "discard")).toMatchObject({ label: "Discard pile: 10 of clubs", disabled: true });
    rummyView.press(card(3, 12), at);
    expect(keyed(rummyView.buttons(at), "discard")).toMatchObject({ label: "Discard the king of clubs", disabled: false });
    rummyView.press("discard", at);
    expect(at.ctx.play).toHaveBeenCalledWith(`x${card(3, 12)}`);
    const taken = seat(rummyView, state({ step: "play", took: card(1, 9) }), { local: { selected: [card(1, 9)] } });
    expect(keyed(rummyView.buttons(taken), "discard").disabled).toBe(true);
  });

  it("shows the melds on the table and adds the selected card to one where it fits", () => {
    const melds = [[card(0, 5), card(0, 6), card(0, 7)], [card(0, 12), card(1, 12), card(2, 12)]];
    const at = seat(rummyView, state({ step: "play", melds }));
    expect(keyed(rummyView.buttons(at), "m0")).toMatchObject({ label: "On the table: 6 of spades, 7 of spades, 8 of spades", disabled: true });
    rummyView.press(card(0, 4), at);
    expect(keyed(rummyView.buttons(at), "m0")).toMatchObject({ label: "Add the 5 of spades to: 6 of spades, 7 of spades, 8 of spades", disabled: false });
    expect(keyed(rummyView.buttons(at), "m1").disabled).toBe(true);
    rummyView.press("m1", at);
    expect(at.ctx.play).not.toHaveBeenCalled();
    rummyView.press("m0", at);
    expect(at.ctx.play).toHaveBeenCalledWith(`a${card(0, 4)}.0`);
    const { keys } = painted(rummyView, at);
    for (const one of melds.flat()) expect(keys).toContain(`f${one}`);
  });

  it("sorts the hand by suit or by rank at the touch of a button, and brackets the cards that already make a meld", () => {
    const at = seat(rummyView, state({ hands: [THEIRS, [...MINE.slice(0, 6), card(1, 3)]] }));
    expect(keyed(rummyView.buttons(at), "sort").label).toBe("Sort by rank");
    const bySuit = painted(rummyView, at).pen.calls.length;
    rummyView.press("sort", at);
    expect(at.local.order).toBe("rank");
    expect(keyed(rummyView.buttons(at), "sort").label).toBe("Sort by suit");
    expect(cards(rummyView.buttons(at)).map((one) => one.key % 13)).toEqual([2, 3, 3, 4, 9, 9, 12]);
    expect(painted(rummyView, at).pen.calls.length).toBeLessThan(bySuit);
  });

  it("draws the other player's hand and the stock as backs and counts: two tables with other hidden cards are drawn alike", () => {
    const one = painted(rummyView, seat(rummyView, state()));
    const two = painted(rummyView, seat(rummyView, state({ hands: [[...THEIRS].reverse().map((held) => (held + 13) % 52).filter((held) => !MINE.includes(held)).concat([44, 45]).slice(0, 7), MINE], stock: [30, 31, 32] })));
    expect(one.keys.filter((key) => key.startsWith("f")).sort()).toEqual([...MINE, card(3, 9)].map((held) => `f${held}`).sort());
    expect(shapes(one.pen)).toEqual(shapes(two.pen));
    expect(one.drawn).toEqual(two.drawn);
    expect(one.pen.calls.filter((call) => call.op === "fillText").map((call) => call.text).sort()).toEqual(["3", "7"]);
    expect(one.pen.depth).toBe(0);
  });

  it("brings a drawn card to the hand and a discard to the pile, the other player's stock card never shown", () => {
    const before = state();
    const drew = after(before, "ds");
    expect(rummyView.flights(before, drew, "ds", 1, 343)).toMatchObject([{ card: 42, flip: "up", hide: ["h42"] }]);
    const theirs = state({}, 0);
    expect(rummyView.flights(theirs, after(theirs, "ds"), "ds", 1, 343)).toMatchObject([{ card: null, hide: ["r"] }]);
    expect(rummyView.flights(theirs, after(theirs, "dd"), "dd", 1, 343)).toMatchObject([{ card: card(3, 9), flip: "down", hide: ["r"] }]);
    const thrown = after(drew, `x${card(3, 12)}`);
    expect(rummyView.flights(drew, thrown, `x${card(3, 12)}`, 1, 343)).toMatchObject([{ card: card(3, 12), hide: ["d"] }]);
    const melded = after(drew, `m${card(0, 2)}.${card(0, 3)}.${card(0, 4)}`);
    const laid = rummyView.flights(drew, melded, `m${card(0, 2)}.${card(0, 3)}.${card(0, 4)}`, 1, 343);
    expect(laid.map((one) => one.hide[0])).toEqual([`m${card(0, 2)}`, `m${card(0, 3)}`, `m${card(0, 4)}`]);
    expect(rummyView.cues(before, drew, "ds")).toEqual([{ cue: "draw", at: 0 }]);
    const hiding = painted(rummyView, { ...seat(rummyView, thrown), hidden: new Set(["d"]) });
    expect(hiding.keys).toContain(`f${card(3, 9)}`);
    expect(hiding.keys).not.toContain(`f${card(3, 12)}`);
  });
});
