import { describe, expect, it } from "vitest";
import { commitText, revealText, seedText, shuffled } from "../../../kit/src/cards/shuffle.js";
import { GAMES, chooseText, initial, play, result, turn } from "../src/rules.js";

const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const replay = (moves, start = initial()) =>
  moves.reduce((state, move) => {
    const played = play(state, move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    return played.state;
  }, start);
const dealt = (choice) => replay([choice, commitText(A), seedText(B), revealText(A)]);

describe("the four games of Card Corner", () => {
  it("are Pairs in two sizes, War, Rummy and Go Fish", () => {
    expect(Object.keys(GAMES)).toEqual(["pairs", "war", "rummy", "fish"]);
    expect(chooseText("pairs", 24)).toBe("gp24");
    expect(chooseText("war")).toBe("gw");
    expect(chooseText("rummy")).toBe("gr");
    expect(chooseText("fish")).toBe("gf");
  });

  it("begin with the starter choosing the game, then both phones shuffle the deck, then the cards are dealt", () => {
    const start = initial();
    expect(start).toMatchObject({ phase: "choose", game: null, next: 0, end: null });
    const chosen = replay(["gw"]);
    expect(chosen).toMatchObject({ phase: "shuffle", game: "war", option: null, next: 0 });
    const state = dealt("gw");
    expect(state).toMatchObject({ phase: "play", game: "war", next: 1 });
    expect(state.table.piles[1].at(-1)).toBe(shuffled(A, B)[0]);
    expect(result(state)).toBeNull();
  });

  it("deal each game its own table from the same deck", () => {
    expect(dealt("gp16").table.cards).toHaveLength(16);
    expect(dealt("gp16").option).toBe(16);
    expect(dealt("gp24").table.cards).toHaveLength(24);
    expect(dealt("gr").table.hands[0]).toHaveLength(7);
    expect(dealt("gf").table.pond).toHaveLength(38);
  });

  it("let the starter hand the choice to the other player, once", () => {
    const handed = replay(["g?"]);
    expect(handed).toMatchObject({ phase: "choose", next: 1, handed: true });
    expect(play(handed, "g?", 1)).toEqual({ error: "illegal" });
    expect(replay(["gf"], handed)).toMatchObject({ phase: "shuffle", game: "fish", next: 0 });
  });

  it("refuse a choice that is no game, a size Pairs does not have, and anything out of turn or after the end", () => {
    for (const move of ["gx", "gp", "gp18", "gw16", "g", "", 7, "x".repeat(65)]) expect(play(initial(), move, 0).error).toBe("bad");
    expect(play(initial(), "gw", 1)).toEqual({ error: "turn" });
    expect(play(replay(["gw"]), "gw", 0)).toEqual({ error: "bad" });
    const state = dealt("gw");
    expect(play(state, "gw", 1)).toEqual({ error: "bad" });
    expect(play({ ...state, phase: "done", end: { winner: 0 } }, "f", 1)).toEqual({ error: "over" });
  });

  it("give the round to the other side when the dealer's reveal does not match its commitment", () => {
    const cheated = replay(["gw", commitText(A), seedText(B), revealText(B)]);
    expect(cheated.phase).toBe("done");
    expect(result(cheated)).toEqual({ winner: 1, reason: "cheat" });
  });

  it("play the chosen game by its own rules until it ends", () => {
    let state = dealt("gw");
    let moves = 0;
    while (!result(state)) {
      state = replay(["f"], state);
      moves += 1;
    }
    expect(state.phase).toBe("done");
    expect(["all", "limit"]).toContain(result(state).reason);
    expect(moves).toBeGreaterThan(10);
    expect(play(dealt("gr"), "f", 1)).toEqual({ error: "bad" });
  });
});
