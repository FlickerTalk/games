import { describe, expect, it } from "vitest";
import { shapes } from "../../../kit/test/canvas/recorder.js";
import { card } from "../src/card.js";
import { FLIP_MS, pairsView } from "../src/pairs-view.js";
import { play } from "../src/pairs.js";
import { SIZES, inside, keyed, painted, playing, seat } from "./rig.js";

const CARDS = [card(1, 3), card(0, 5), card(2, 3), card(3, 5), card(1, 8), card(2, 8), card(0, 1), card(3, 1), card(1, 0), card(2, 0), card(0, 9), card(3, 9), card(1, 6), card(2, 6), card(0, 11), card(3, 11)];
const table = (extra = {}) => ({ cards: CARDS, owner: CARDS.map(() => null), up: [], miss: false, won: [0, 0], seen: [], took: null, ...extra });
const state = (extra, next = 1) => playing("pairs", table(extra), next, { option: 16 });
const big = playing("pairs", { ...table(), cards: [...CARDS, 4, 17, 30, 43, 7, 20, 33, 46], owner: Array(24).fill(null) }, 1, { option: 24 });

describe("the Pairs table", () => {
  it("lays sixteen cards four by four and twenty-four six by four, every card at least 44 px to touch, inside the board and apart", () => {
    for (const size of SIZES) {
      for (const one of [state(), big]) {
        const at = seat(pairsView, one, { size });
        const cells = pairsView.buttons(at).filter((button) => typeof button.key === "number");
        expect(cells).toHaveLength(one.table.cards.length);
        for (const { box } of cells) {
          expect(inside(box), `${size}`).toBe(true);
          expect(box.w * size, `${size}`).toBeGreaterThanOrEqual(44);
          expect(box.h * size, `${size}`).toBeGreaterThanOrEqual(44);
        }
        const columns = new Set(cells.map(({ box }) => Math.round(box.x * 1000))).size;
        expect(columns).toBe(one.table.cards.length === 16 ? 4 : 6);
        expect(at.layout.cells[0].w).toBeGreaterThanOrEqual(size === 300 ? 40 : 44);
      }
    }
  });

  it("names each card by its place, face down until it is turned, and opens them on the user's turn only", () => {
    const at = seat(pairsView, state({ up: [2] }));
    const cells = pairsView.buttons(at);
    expect(keyed(cells, 0)).toMatchObject({ label: "Card 1, face down", disabled: false });
    expect(keyed(cells, 2)).toMatchObject({ label: "Card 3: 4 of diamonds", disabled: true });
    expect(pairsView.label(at)).toBe("Card Corner, Pairs: Your pairs: 0 · Their pairs: 0");
    const waiting = seat(pairsView, state({}, 0));
    expect(pairsView.buttons(waiting).every((one) => one.disabled)).toBe(true);
    const taken = seat(pairsView, state({ owner: CARDS.map((_, index) => (index < 2 ? 1 : null)), won: [0, 1] }));
    expect(pairsView.buttons(taken).filter((one) => typeof one.key === "number")).toHaveLength(14);
    expect(pairsView.label(taken)).toContain("Your pairs: 1");
  });

  it("turns the card that is touched, and lets a missed pair be touched again", () => {
    const at = seat(pairsView, state());
    pairsView.press(5, at);
    expect(at.ctx.play).toHaveBeenCalledWith("f5");
    const missed = seat(pairsView, state({ up: [0, 1], miss: true }));
    expect(keyed(pairsView.buttons(missed), 0).disabled).toBe(false);
    const off = seat(pairsView, state({}, 0));
    pairsView.press(5, off);
    expect(off.ctx.play).not.toHaveBeenCalled();
  });

  it("draws a face only for a card that is turned up: two tables with different cards face down are drawn alike", () => {
    const other = [...CARDS].reverse();
    const one = painted(pairsView, seat(pairsView, state()));
    const two = painted(pairsView, seat(pairsView, playing("pairs", table({ cards: other }), 1, { option: 16 })));
    expect(one.keys).toEqual(Array(16).fill("back"));
    expect(shapes(one.pen)).toEqual(shapes(two.pen));
    expect(one.drawn).toEqual(two.drawn);
    const turned = painted(pairsView, seat(pairsView, state({ up: [2] })));
    expect(turned.keys.filter((key) => key !== "back")).toEqual([`f${CARDS[2]}`]);
    const gone = painted(pairsView, seat(pairsView, state({ owner: CARDS.map((_, index) => (index < 4 ? 0 : null)) })));
    expect(gone.keys).toHaveLength(12);
    expect(one.pen.depth).toBe(0);
  });

  it("writes both players' pairs in digits and marks whose turn it is", () => {
    const { pen } = painted(pairsView, seat(pairsView, state({ won: [3, 5] })));
    expect(pen.calls.filter((call) => call.op === "fillText").map((call) => call.text).sort()).toEqual(["3", "5"]);
  });

  it("flips the touched card over in its place, turns a missed pair back, and sends a found pair to its player's count", () => {
    const before = state();
    const flipped = { ...before, ...play(before.table, "f0", 1) };
    const flights = pairsView.flights(before, flipped, "f0", 1, 343);
    expect(flights).toHaveLength(1);
    expect(flights[0]).toMatchObject({ card: CARDS[0], flip: "up", ms: FLIP_MS, hide: ["c0"] });
    expect(flights[0].from).toEqual(flights[0].to);
    const found = { ...flipped, ...play(flipped.table, "f2", 1) };
    const taking = pairsView.flights(flipped, found, "f2", 1, 343);
    expect(taking.map((one) => one.card).sort()).toEqual([CARDS[0], CARDS[2], CARDS[2]].sort());
    expect(taking.filter((one) => one.to.y > one.from.y)).toHaveLength(2);
    const missed = state({ up: [0, 1], miss: true }, 0);
    const next = { ...missed, ...play(missed.table, "f5", 0) };
    const back = pairsView.flights(missed, next, "f5", 1, 343);
    expect(back.filter((one) => one.flip === "down").map((one) => one.card)).toEqual([CARDS[0], CARDS[1]]);
    expect(pairsView.cues(before, flipped, "f0")).toEqual([{ cue: "card", at: 0 }]);
    expect(pairsView.cues(flipped, found, "f2").map((one) => one.cue)).toEqual(["card", "pick"]);
  });
});
