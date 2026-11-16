// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CELLS, MOST_HITS, boutOf, energyOf, exchange, lampsOf, moveOf, readMoves, writeMoves } from "../src/bout.js";

describe("an exchange of moves", () => {
  it("names the move from the buttons held: none, the glove, the boot, or both for the shield", () => {
    expect([0, 1, 2, 3].map(moveOf)).toEqual(["n", "g", "b", "s"]);
  });

  it("lets the glove land before the boot, the boot under the shield, and the shield send the glove back", () => {
    expect(exchange("g", "b").landed).toEqual([1, 0]);
    expect(exchange("b", "g").landed).toEqual([0, 1]);
    expect(exchange("b", "s").landed).toEqual([1, 0]);
    expect(exchange("s", "b").landed).toEqual([0, 1]);
    expect(exchange("s", "g").landed).toEqual([1, 0]);
    expect(exchange("g", "s").landed).toEqual([0, 1]);
  });

  it("lands a glove or a boot on a robot that did nothing, and nothing when both do the same", () => {
    expect(exchange("g", "n").landed).toEqual([1, 0]);
    expect(exchange("n", "b").landed).toEqual([0, 1]);
    for (const same of ["g", "b", "s", "n"]) expect(exchange(same, same).landed, same).toEqual([0, 0]);
    expect(exchange("s", "n").landed).toEqual([0, 0]);
  });

  it("says what happened, for the drawing", () => {
    expect(exchange("g", "b").kind).toBe("hit");
    expect(exchange("g", "s").kind).toBe("block");
    expect(exchange("g", "g").kind).toBe("clash");
    expect(exchange("b", "b").kind).toBe("clash");
    expect(exchange("s", "n").kind).toBe("none");
  });
});

describe("a bout", () => {
  it("counts the hits each robot landed over the exchanges both have played", () => {
    const bout = boutOf(["g", "g", "s", "n"], ["b", "s", "g"]);
    expect(bout).toMatchObject({ hits: [2, 1], count: 3, over: false });
  });

  it("empties one battery a hit, topples a robot at the third and winds it up again with full batteries", () => {
    expect(energyOf([0, 0], 0)).toBe(CELLS);
    expect(energyOf([0, 2], 0)).toBe(1);
    expect(energyOf([0, 3], 0)).toBe(CELLS);
    expect(lampsOf([4, 3], 0)).toBe(1);
    expect(lampsOf([4, 3], 1)).toBe(1);
    expect(boutOf(["g", "g", "g"], ["n", "n", "n"]).toppled).toBe(1);
    expect(boutOf(["g", "g", "g", "s"], ["n", "n", "n", "s"]).toppled).toBeNull();
  });

  it("is over at the third lamp or when the exchanges run out, and ignores what was played after", () => {
    const nine = new Array(12).fill("g");
    const idle = new Array(12).fill("n");
    const bout = boutOf(nine, idle);
    expect(bout).toMatchObject({ hits: [MOST_HITS, 0], count: 9, over: true });
    expect(energyOf(bout.hits, 1)).toBe(0);
    expect(boutOf(["g", "b"], ["b", "g"], 2)).toMatchObject({ hits: [1, 1], count: 2, over: true });
    expect(boutOf(["g", "b", "g"], ["b", "g", "n"], 2).hits).toEqual([1, 1]);
  });

  it("is the same bout whichever phone works it out", () => {
    const [one, two] = [["g", "s", "b", "b", "n"], ["s", "s", "g", "s"]];
    const here = boutOf(one, two);
    const there = boutOf(two, one);
    expect(here.hits).toEqual([...there.hits].reverse());
    expect(here.count).toBe(there.count);
  });

  it("writes the moves as one letter each and reads back only such a list", () => {
    expect(writeMoves(["g", "b", "s", "n"])).toBe("gbsn");
    expect(readMoves("gbsn", 10)).toEqual(["g", "b", "s", "n"]);
    expect(readMoves("", 10)).toEqual([]);
    expect(readMoves("gx", 10)).toBeNull();
    expect(readMoves("ggg", 2)).toBeNull();
    expect(readMoves(12, 10)).toBeNull();
  });
});
