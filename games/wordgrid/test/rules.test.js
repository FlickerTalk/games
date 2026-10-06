// The rules of Letter Grid as the kit asks for them: sixteen letters drawn from two seeds by
// commit and reveal, words found along touching cells and in the word list, said in turn, scored
// by length, and two passes in a row to end the round.
import { describe, expect, it } from "vitest";
import { PLAYS } from "../../../preview/shots.js";
import { CELLS, LANGS, accepted, commitText, decode, gridOf, initial, langFor, pathOf, play, points, refusal, result, revealText, seedText, turn, words, wordsOn } from "../src/rules.js";

const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const OPENING = [commitText("en", A), seedText(B), revealText(A)];

function after(moves, from = initial()) {
  let state = from;
  for (const move of moves) {
    const played = play(state, move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    state = played.state;
  }
  return state;
}

/** A grid set by hand, English, side 1 to move. */
const grid = (letters) => ({ ...after(OPENING), grid: [...letters], next: 1 });

describe("the words", () => {
  it("come in English and Spanish, three to six letters, read back from their shared-prefix writing", () => {
    expect(LANGS).toEqual(["en", "es"]);
    expect(decode("0abaca 5s 1bbey")).toEqual(["abaca", "abacas", "abbey"]);
    for (const lang of LANGS) {
      const { accepted: all, prefixes } = words(lang);
      expect(all.size).toBeGreaterThan(5000);
      for (const word of all) expect(word, lang).toMatch(/^[a-zñ]{3,6}$/);
      expect(prefixes.has("ab")).toBe(true);
    }
    expect(accepted("en", "coffee")).toBe(true);
    expect(accepted("en", "qqq")).toBe(false);
    expect(accepted("en", "ab")).toBe(false);
    expect(accepted("es", "jinete")).toBe(true);
    expect(accepted("es", "coffee")).toBe(false);
    expect(langFor("es-ES")).toBe("es");
    expect(langFor("fr")).toBe("en");
    expect(points("cat")).toBe(1);
    expect(points("cats")).toBe(1);
    expect(points("coats")).toBe(2);
    expect(points("coffee")).toBe(3);
  });
});

describe("the draw", () => {
  it("is a commitment with the language by side 0, a seed by side 1 and a reveal, then sixteen letters and side 1 to move", () => {
    expect(turn(initial())).toBe(0);
    const committed = after([OPENING[0]]);
    expect(committed.lang).toBe("en");
    expect(turn(committed)).toBe(1);
    const drawn = after(OPENING);
    expect(drawn.phase).toBe("play");
    expect(drawn.grid).toHaveLength(CELLS);
    expect(drawn.grid.join("")).toMatch(/^[a-z]{16}$/);
    expect(drawn.grid.filter((one) => "aeiou".includes(one)).length).toBeGreaterThanOrEqual(4);
    expect(turn(drawn)).toBe(1);
    expect(gridOf("en", A, B)).toEqual(drawn.grid);
    expect(gridOf("en", B, A)).not.toEqual(drawn.grid);
    expect(gridOf("es", A, B).join("")).toMatch(/^[a-zñ]{16}$/);
  });

  it("refuses what is not its move, and gives the round to side 1 when the reveal does not match", () => {
    expect(play(initial(), "wcat", 0)).toEqual({ error: "bad" });
    expect(play(initial(), `cfr${"a".repeat(43)}`, 0)).toEqual({ error: "bad" });
    expect(play(initial(), OPENING[0], 1)).toEqual({ error: "turn" });
    expect(play(after([OPENING[0]]), "sshort", 1)).toEqual({ error: "bad" });
    const cheated = after([revealText(B)], after(OPENING.slice(0, 2)));
    expect(result(cheated)).toEqual({ winner: 1, reason: "cheat" });
  });
});

describe("a word on the grid", () => {
  const letters = "catsoxeetnrfdlmp";

  it("runs along touching cells, each once", () => {
    expect(pathOf([...letters], "cat")).toEqual([0, 1, 2]);
    expect(pathOf([...letters], "cost")).toBeNull("the s at the end of the first row does not touch the o under the c");
    expect(pathOf([...letters], "sex")).toEqual([3, 6, 5]);
    expect(pathOf([...letters], "tee")).toEqual([2, 6, 7]);
    expect(pathOf([...letters], "ate")).toEqual([1, 2, 6]);
    expect(pathOf([...letters], "tat")).toBeNull("the one t cannot be used twice");
    expect(pathOf([...letters], "cap")).toBeNull();
  });

  it("is found by the search, every one of the language on the grid", () => {
    const found = wordsOn([...letters], "en");
    expect(found).toContain("cat");
    expect(found).toContain("sex");
    expect(found).not.toContain("tat");
    for (const word of found) expect(pathOf([...letters], word), word).not.toBeNull();
    expect(found[0].length).toBeGreaterThanOrEqual(found.at(-1).length);
  });
});

describe("a turn", () => {
  const state = grid("catsoxeetnrfdlmp");

  it("says a word, scores it, and passes the turn", () => {
    const one = after(["wcat"], state);
    expect(one.said[1]).toEqual(["cat"]);
    expect(one.score).toEqual([0, 1]);
    expect(turn(one)).toBe(0);
    const two = after(["wsex"], one);
    expect(two.score).toEqual([1, 1]);
    expect(two.passes).toBe(0);
  });

  it("refuses a word too short, not in the list, already said, or not on the grid like that", () => {
    expect(refusal(state, "at")).toBe("short");
    expect(refusal(state, "qqq")).toBe("unknown");
    expect(refusal(state, "tat")).toBe("grid");
    expect(refusal(after(["wcat"], state), "cat")).toBe("used");
    expect(refusal(state, "cat")).toBeNull();
    expect(play(state, "wat", 1)).toEqual({ error: "illegal" });
    expect(play(state, "wtat", 1)).toEqual({ error: "illegal" });
    expect(play(after(["wcat"], state), "wcat", 0)).toEqual({ error: "illegal" });
    expect(play(state, "w", 1)).toEqual({ error: "bad" });
    expect(play(state, "wCAT", 1)).toEqual({ error: "bad" });
    expect(play(state, "wcat", 0)).toEqual({ error: "turn" });
  });

  it("ends the round after two passes in a row: more points win, as many is a draw", () => {
    const one = after(["wcat", "wsex", "x"], state);
    expect(one.passes).toBe(1);
    expect(result(one)).toBeNull();
    const ended = after(["x"], one);
    expect(result(ended)).toEqual({ winner: null, reason: "passed", score: [1, 1] });
    expect(play(ended, "wtee", 1)).toEqual({ error: "over" });
    const won = after(["wcat", "x", "x"], state);
    expect(result(won)).toEqual({ winner: 1, reason: "passed", score: [0, 1] });
    expect(result(after(["x", "x"], state))).toEqual({ winner: null, reason: "passed", score: [0, 0] });
  });

  it("plays the screenshot lines out: the starter wins one, the other is a draw", () => {
    const { opening, winning, draw } = PLAYS.wordgrid;
    expect(result(after(opening))).toBeNull();
    expect(result(after([...opening, ...winning]))).toMatchObject({ winner: 0, reason: "passed" });
    expect(result(after(draw))).toMatchObject({ winner: null });
  });

  it("never changes the state it is given", () => {
    const copy = structuredClone(state);
    play(state, "wcat", 1);
    expect(state).toEqual(copy);
  });
});
