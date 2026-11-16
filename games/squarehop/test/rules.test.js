import { describe, expect, it } from "vitest";
import { seeded } from "../../../kit/test/helpers.js";
import { FINISH, SPECIALS, SPRING_JUMP, diceFor, hop, kindOf, startRace } from "../src/rules.js";

const KEY = Uint8Array.from({ length: 48 }, (_, at) => at);
const race = (change = {}) => ({ ...startRace(), ...change });

describe("the track", () => {
  it("has thirty squares, the last one the finish, with two springs, a turbo and two puddles on the way", () => {
    expect(FINISH).toBe(30);
    expect(kindOf(1)).toBe("plain");
    expect(kindOf(FINISH)).toBe("finish");
    expect(Object.values(SPECIALS).sort()).toEqual(["puddle", "puddle", "spring", "spring", "turbo"]);
    for (const [square, kind] of Object.entries(SPECIALS)) {
      expect(kindOf(Number(square))).toBe(kind);
      if (kind === "spring") expect(kindOf(Number(square) + SPRING_JUMP)).toBe("plain");
    }
  });
});

describe("the dice of a turn", () => {
  it("are two different faces from 1 to 6, the same for the same seed and turn", () => {
    for (let turn = 0; turn < 200; turn += 1) {
      const [one, two] = diceFor(KEY, turn);
      expect(one).not.toBe(two);
      for (const face of [one, two]) expect(Number.isInteger(face) && face >= 1 && face <= 6).toBe(true);
      expect(diceFor(KEY, turn)).toEqual([one, two]);
    }
  });

  it("change with the turn and with the seed, and show every face in the long run", () => {
    const seen = new Set();
    const rolls = [];
    for (let turn = 0; turn < 120; turn += 1) {
      const dice = diceFor(KEY, turn);
      dice.forEach((face) => seen.add(face));
      rolls.push(dice.join(""));
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(rolls).size).toBeGreaterThan(20);
    const other = Uint8Array.from(KEY, (byte) => byte ^ 1);
    expect(Array.from({ length: 30 }, (_, turn) => diceFor(other, turn).join(""))).not.toEqual(rolls.slice(0, 30));
  });
});

describe("a hop", () => {
  it("moves the side to play as many squares as the die and passes the turn", () => {
    const { race: after, event } = hop(startRace(), 4);
    expect(after).toEqual({ at: [5, 1], wait: [false, false], next: 1, turn: 1, winner: null });
    expect(event).toMatchObject({ side: 0, die: 4, from: 1, landed: 5, to: 5, kind: "plain", bumped: null, again: false, sat: false, won: false });
  });

  it("leaves the race it was given untouched", () => {
    const before = startRace();
    const copy = structuredClone(before);
    hop(before, 5);
    expect(before).toEqual(copy);
  });

  it("jumps three squares on from a spring", () => {
    const { race: after, event } = hop(race({ at: [3, 1] }), 3);
    expect(event).toMatchObject({ landed: 6, kind: "spring", to: 9 });
    expect(after.at).toEqual([9, 1]);
  });

  it("plays again from the turbo", () => {
    const { race: after, event } = hop(race({ at: [8, 1] }), 3);
    expect(event).toMatchObject({ landed: 11, kind: "turbo", again: true });
    expect(after.next).toBe(0);
    expect(after.turn).toBe(1);
  });

  it("sits the next turn out after a puddle, and the other side plays twice", () => {
    const wet = hop(race({ at: [12, 1] }), 4);
    expect(wet.event).toMatchObject({ landed: 16, kind: "puddle" });
    expect(wet.race).toMatchObject({ wait: [true, false], next: 1 });
    const twice = hop(wet.race, 2);
    expect(twice.event.sat).toBe(true);
    expect(twice.race).toMatchObject({ wait: [false, false], next: 1 });
    expect(hop(twice.race, 2).race.next).toBe(0);
  });

  it("lets two waits cancel out", () => {
    const { race: after } = hop(race({ at: [20, 25], wait: [true, false], next: 1 }), 2);
    expect(after).toMatchObject({ at: [20, 27], wait: [false, false], next: 0 });
  });

  it("bumps the other piece one square back when it lands on it, after a spring too", () => {
    const { race: after, event } = hop(race({ at: [4, 8] }), 4);
    expect(event.bumped).toEqual({ side: 1, from: 8, to: 7 });
    expect(after.at).toEqual([8, 7]);
    expect(hop(race({ at: [3, 9] }), 3).race.at).toEqual([9, 8]);
    expect(hop(race({ at: [1, 2] }), 1).race.at).toEqual([2, 1]);
  });

  it("wins on reaching the last square, with a die to spare or not", () => {
    for (const die of [2, 6]) {
      const { race: after, event } = hop(race({ at: [28, 12] }), die);
      expect(event).toMatchObject({ landed: FINISH, to: FINISH, kind: "finish", won: true, bumped: null });
      expect(after.winner).toBe(0);
    }
  });

  it("refuses a die that is not one, and any hop once the race is won", () => {
    expect(hop(startRace(), 0)).toBeNull();
    expect(hop(startRace(), 7)).toBeNull();
    expect(hop(startRace(), 2.5)).toBeNull();
    expect(hop(race({ winner: 1 }), 3)).toBeNull();
  });

  it("always reaches the finish, whichever die is chosen", () => {
    const random = seeded(11);
    for (let game = 0; game < 200; game += 1) {
      const key = Uint8Array.from({ length: 48 }, () => Math.floor(random() * 256));
      let now = startRace();
      for (let turns = 0; now.winner === null; turns += 1) {
        expect(turns).toBeLessThan(120);
        now = hop(now, diceFor(key, now.turn)[random() < 0.5 ? 0 : 1]).race;
        for (const square of now.at) expect(square >= 1 && square <= FINISH).toBe(true);
      }
    }
  });
});
