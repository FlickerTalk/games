// The board of mancala: one's own six pits along the bottom as buttons, the other's along the top
// from their left, a store at each end, every one named with its seeds for a screen reader in the
// user's language; only one's own pits with seeds open on one's turn; the pit last emptied marked,
// a pending move too.
import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { SEED_MARKS, board } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { initial, play, result, turn } from "../src/rules.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function context(moves, extra = {}) {
  let state = initial();
  for (const move of moves) state = play(state, move, turn(state)).state;
  const over = result(state);
  return {
    state,
    mySide: turn(state),
    canPlay: !over,
    last: moves.at(-1) ?? null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    view: { round: { moves } },
    ...extra,
  };
}

const pit = (host, index) => host.querySelector(`[data-pit="${index}"]`);
const store = (host, side) => host.querySelector(`[data-store="${side}"]`);

describe("the board", () => {
  it("lays one's own pits along the bottom and the other's along the top, each named with its seeds", () => {
    const host = document.createElement("div");
    board.mount(host, context([]));
    expect(host.querySelectorAll("button.fmc-pit")).toHaveLength(6);
    expect(host.querySelectorAll(".fmc-pit.theirs")).toHaveLength(6);
    expect(host.querySelector('[role="group"]').getAttribute("aria-label")).toBe("Board: 0 seeds to 0");
    expect(pit(host, 0).getAttribute("aria-label")).toBe("Your pit 1: 4 seeds");
    expect(pit(host, 7).getAttribute("aria-label")).toBe("Their pit 1: 4 seeds");
    expect(store(host, 0).getAttribute("aria-label")).toBe("Your store: 0 seeds");
    expect(store(host, 1).getAttribute("aria-label")).toBe("Their store: 0 seeds");
    // Their first pit sits over my last one: the seeds go round.
    expect(pit(host, 7).style.gridColumn).toBe("7");
    expect(pit(host, 0).style.gridColumn).toBe("2");
    expect(SEED_MARKS).toHaveLength(2);
  });

  it("opens only one's own pits with seeds, on one's turn, and plays one on a tap", () => {
    const host = document.createElement("div");
    const ctx = context([0]); // side 1 to move
    const theirs = { ...ctx, mySide: 1 };
    board.mount(host, theirs);
    expect(pit(host, 7).tagName).toBe("BUTTON");
    expect(pit(host, 0).tagName).toBe("SPAN");
    pit(host, 7).click();
    expect(ctx.play).toHaveBeenCalledWith(0);
    const emptied = document.createElement("div");
    const mine = context([0], { mySide: 0, canPlay: true });
    board.mount(emptied, mine);
    expect(pit(emptied, 0).disabled).toBe(true);
    expect(pit(emptied, 1).disabled).toBe(false);
    const waiting = document.createElement("div");
    board.mount(waiting, context([0], { mySide: 0, canPlay: false }));
    expect(waiting.querySelectorAll(".fmc-pit:enabled")).toHaveLength(0);
  });

  it("turns the board for side 1 and speaks the user's language", () => {
    const host = document.createElement("div");
    board.mount(host, context([], { mySide: 1, canPlay: false, lang: "es", t: (key, vars) => translate("es", key, vars) }));
    expect(pit(host, 7).tagName).toBe("BUTTON");
    expect(pit(host, 7).getAttribute("aria-label")).toBe("Tu hoyo 1: 4 semillas");
    expect(pit(host, 0).getAttribute("aria-label")).toBe("Su hoyo 1: 4 semillas");
    expect(store(host, 1).getAttribute("aria-label")).toBe("Tu almacén: 0 semillas");
  });

  it("marks the pit last emptied, whoever emptied it, and a move still on its way", () => {
    const host = document.createElement("div");
    const mounted = board.mount(host, context([]));
    mounted.update(context([2], { mySide: 0, pending: true }));
    // Side 0 sowed its pit 2 and moves again: the mark is on its own pit 2.
    expect(pit(host, 2).classList.contains("last")).toBe(true);
    expect(pit(host, 2).querySelector(".fmc-clock")).not.toBeNull();
    mounted.update(context([2, 0], { mySide: 0 }));
    // Then side 0 sowed pit 0, and the other side's turn came: still side 0's pit.
    expect(pit(host, 0).classList.contains("last")).toBe(true);
    mounted.update(context([2, 0, 3], { mySide: 0 }));
    // Side 1 sowed its pit 3 (the board's pit 10).
    expect(pit(host, 10).classList.contains("last")).toBe(true);
    expect(host.querySelectorAll(".fmc-clock")).toHaveLength(0);
  });
});
