import { describe, expect, it } from "vitest";
import { seeded } from "../../../kit/test/helpers.js";
import { flickPick, worthOf } from "../src/flick.js";
import { diceFor, hop, startRace } from "../src/rules.js";

const race = (change = {}) => ({ ...startRace(), next: 1, ...change });
const always = { skill: 1, random: () => 0.5 };

describe("Flick choosing a die", () => {
  it("takes the die that wins the race", () => {
    expect(flickPick(race({ at: [10, 26] }), [2, 4], always)).toBe(1);
    expect(flickPick(race({ at: [10, 26] }), [5, 1], always)).toBe(0);
  });

  it("goes for the spring and the turbo, stays out of the puddle, and bumps when it costs nothing", () => {
    expect(flickPick(race({ at: [1, 3] }), [3, 4], always)).toBe(0);
    expect(flickPick(race({ at: [1, 8] }), [4, 3], always)).toBe(1);
    expect(flickPick(race({ at: [1, 12] }), [4, 3], always)).toBe(1);
    expect(worthOf(race({ at: [20, 17] }), 3)).toBeGreaterThan(worthOf(race({ at: [21, 17] }), 3));
  });

  it("otherwise takes the longer hop", () => {
    expect(flickPick(race({ at: [1, 17] }), [2, 5], always)).toBe(1);
  });

  it("with less skill sometimes takes the other die, so it can be beaten", () => {
    const random = seeded(3);
    const picks = Array.from({ length: 400 }, () => flickPick(race({ at: [1, 17] }), [2, 5], { skill: 0.6, random }));
    const best = picks.filter((pick) => pick === 1).length;
    expect(best).toBeGreaterThan(200);
    expect(best).toBeLessThan(290);
  });

  it("beats a player who picks at random more often than not at full skill, and not always", () => {
    const random = seeded(21);
    let wins = 0;
    const games = 300;
    for (let game = 0; game < games; game += 1) {
      const key = Uint8Array.from({ length: 48 }, () => Math.floor(random() * 256));
      let now = startRace();
      while (now.winner === null) {
        const dice = diceFor(key, now.turn);
        const pick = now.next === 1 ? flickPick(now, dice, { skill: 1, random }) : random() < 0.5 ? 0 : 1;
        now = hop(now, dice[pick]).race;
      }
      wins += now.winner;
    }
    expect(wins).toBeGreaterThan(games * 0.5);
    expect(wins).toBeLessThan(games * 0.9);
  });
});
