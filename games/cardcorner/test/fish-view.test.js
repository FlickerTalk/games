import { describe, expect, it } from "vitest";
import { shapes } from "../../../kit/test/canvas/recorder.js";
import { card } from "../src/card.js";
import { play } from "../src/fish.js";
import { fishView } from "../src/fish-view.js";
import { SIZES, inside, keyed, painted, playing, seat } from "./rig.js";

const MINE = [card(0, 4), card(1, 4), card(0, 9), card(2, 11), card(3, 0), card(1, 6), card(2, 2)];
const THEIRS = [card(2, 4), card(1, 11), card(3, 11), card(0, 7), card(1, 8), card(2, 12), card(3, 5)];
const table = (extra = {}) => ({ hands: [THEIRS, MINE], pond: [card(3, 9), card(3, 2), card(3, 4)], books: [[], []], last: null, ...extra });
const state = (extra, next = 1) => playing("fish", table(extra), next);
const after = (before, move, side = before.next) => ({ ...before, ...play(before.table, move, side) });
const cards = (list) => list.filter((one) => typeof one.key === "number");

describe("the Go Fish table", () => {
  it("lays a button over every card of the hand, at least 44 px, and one over the pond, inside the board", () => {
    for (const size of SIZES) {
      const all = fishView.buttons(seat(fishView, state(), { size }));
      expect(cards(all)).toHaveLength(7);
      for (const { box, key } of all) {
        expect(inside(box), `${size} ${key}`).toBe(true);
        expect(box.w * size, `${size} ${key}`).toBeGreaterThanOrEqual(43.9);
        expect(box.h * size, `${size} ${key}`).toBeGreaterThanOrEqual(size === 300 ? 36 : 44);
      }
    }
  });

  it("asks for the rank of the card that is touched, on the user's turn only", () => {
    const at = seat(fishView, state());
    expect(keyed(fishView.buttons(at), card(2, 11))).toMatchObject({ label: "Ask for: queen", disabled: false });
    expect(keyed(fishView.buttons(at), card(0, 4))).toMatchObject({ label: "Ask for: 5" });
    expect(keyed(fishView.buttons(at), "pond")).toMatchObject({ label: "Pond: 3 cards", disabled: true });
    fishView.press(card(1, 4), at);
    expect(at.ctx.play).toHaveBeenCalledWith("a4");
    const waiting = seat(fishView, state({}, 0));
    expect(cards(fishView.buttons(waiting)).every((one) => one.disabled)).toBe(true);
    fishView.press(card(1, 4), waiting);
    expect(waiting.ctx.play).not.toHaveBeenCalled();
    expect(fishView.label(at)).toBe("Card Corner, Go Fish: Their hand: 7 cards · Their books: 0 · Pond: 3 cards · Your books: 0 · Your hand: 7 cards");
  });

  it("opens the pond when the user has no cards left", () => {
    const at = seat(fishView, state({ hands: [THEIRS, []] }));
    expect(keyed(fishView.buttons(at), "pond")).toMatchObject({ label: "Take a card from the pond (3 left)", disabled: false });
    fishView.press("pond", at);
    expect(at.ctx.play).toHaveBeenCalledWith("d");
  });

  it("says in words for a screen reader what was asked last and what came of it, and shows it without words", () => {
    const got = after(state(), "a4");
    const said = keyed(fishView.buttons(seat(fishView, got)), "said");
    expect(said).toMatchObject({ label: "You asked for: 5 · Cards handed over: 1", disabled: true });
    const fished = after(state({}, 0), "a7", 0);
    expect(keyed(fishView.buttons(seat(fishView, fished)), "said").label).toBe("They asked for: 8 · Go fish");
    const { pen } = painted(fishView, seat(fishView, fished));
    expect(pen.calls.filter((call) => call.op === "fillText").map((call) => call.text).sort()).toEqual(["0", "0", "2", "8"]);
    expect(keyed(fishView.buttons(seat(fishView, state())), "said")).toBeUndefined();
  });

  it("shows each player's books as their rank on a small card, with their number", () => {
    const booked = state({ books: [[3, 8], [12]] });
    const { pen } = painted(fishView, seat(fishView, booked));
    expect(pen.calls.filter((call) => call.op === "fillText").map((call) => call.text).sort()).toEqual(["1", "2", "3", "7"]);
    expect(fishView.label(seat(fishView, booked))).toContain("Your books: 1");
  });

  it("draws the other player's hand and the pond as backs and counts: two tables with other hidden cards are drawn alike", () => {
    const one = painted(fishView, seat(fishView, state()));
    const two = painted(fishView, seat(fishView, state({ hands: [[1, 3, 5, 7, 8, 10, 12], MINE], pond: [50, 49, 48] })));
    expect(one.keys.filter((key) => key.startsWith("f")).sort()).toEqual(MINE.map((held) => `f${held}`).sort());
    expect(shapes(one.pen)).toEqual(shapes(two.pen));
    expect(one.drawn).toEqual(two.drawn);
    expect(one.pen.depth).toBe(0);
  });

  it("slides the cards asked for across the table and brings a fished card from the pond, face down for the other player", () => {
    const before = state();
    const got = after(before, "a4");
    expect(fishView.flights(before, got, "a4", 1, 343)).toMatchObject([{ card: card(2, 4), flip: "up", hide: [`h${card(2, 4)}`] }]);
    const fished = after(before, "a9");
    expect(fishView.flights(before, fished, "a9", 1, 343)).toMatchObject([{ card: card(3, 4), flip: "up", hide: [`h${card(3, 4)}`] }]);
    const theirs = state({}, 0);
    expect(fishView.flights(theirs, after(theirs, "a7", 0), "a7", 1, 343)).toMatchObject([{ card: null, hide: ["r"] }]);
    expect(fishView.flights(theirs, after(theirs, "a4", 0), "a4", 1, 343).map((one) => one.card).sort()).toEqual([card(0, 4), card(1, 4)].sort());
    expect(fishView.cues(before, got, "a4").map((one) => one.cue)).toEqual(["pick", "card"]);
    expect(fishView.cues(before, fished, "a9").map((one) => one.cue)).toEqual(["pick", "draw"]);
  });
});
