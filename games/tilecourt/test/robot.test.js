import { describe, expect, it } from "vitest";
import { seeded } from "../../../kit/test/helpers.js";
import { EMPTY, fits, spots } from "../src/court.js";
import { pieceOf } from "../src/pieces.js";
import { encodeReport } from "../src/report.js";
import { placeInRound, startRound } from "../src/round.js";
import { robotMove, robotRound } from "../src/robot.js";
import { initial, play, result, turn } from "../src/duel-rules.js";
import { playOut } from "../../../kit/test/helpers.js";

const seeds = (count, prefix) => Array.from({ length: count }, (_, at) => `${prefix}${String(at).padStart(8 - prefix.length, "0")}`);
const mean = (list) => list.reduce((sum, value) => sum + value, 0) / list.length;

function firstFit(round) {
  let now = round;
  while (!now.over) {
    const slot = now.slots.findIndex((id) => id && spots(now.court, pieceOf(id)).length);
    now = placeInRound(now, slot, spots(now.court, pieceOf(now.slots[slot]))[0]).round;
  }
  return now;
}

describe("Flick, the phone's player", () => {
  it("lays a piece where it completes a row when it can", () => {
    const round = startRound({ seed: "RobotRow" });
    const court = { size: 8, cells: Array(64).fill(EMPTY) };
    for (let x = 0; x < 6; x += 1) court.cells[40 + x] = 1;
    const ready = { ...round, court, slots: ["single", "domino-h", "square"] };
    const [slot, at] = robotMove(ready, { skill: 1, random: seeded(1) });
    expect([slot, at]).toEqual([1, 46]);
  });

  it("only ever makes legal moves, and plays any round to its end", () => {
    for (const seed of seeds(12, "legal")) {
      let round = startRound({ seed });
      const random = seeded(7);
      while (!round.over) {
        const [slot, at] = robotMove(round, { skill: 0.6, random });
        expect(fits(round.court, pieceOf(round.slots[slot]), at)).toBe(true);
        round = placeInRound(round, slot, at).round;
      }
      expect(["done", "full"]).toContain(round.over);
    }
  });

  it("plays the same round the same way from the same random numbers", () => {
    const one = robotRound(startRound({ seed: "SameWay1" }), { skill: 0.7, random: seeded(3) });
    const two = robotRound(startRound({ seed: "SameWay1" }), { skill: 0.7, random: seeded(3) });
    expect(two.placements).toEqual(one.placements);
  });

  it("plays better than laying each piece in the first free place, and worse when it eases off", () => {
    const list = seeds(16, "skill");
    const best = mean(list.map((seed) => robotRound(startRound({ seed }), { skill: 1, random: seeded(5) }).score));
    const eased = mean(list.map((seed) => robotRound(startRound({ seed }), { skill: 0.3, random: seeded(5) }).score));
    const plain = mean(list.map((seed) => firstFit(startRound({ seed })).score));
    expect(best).toBeGreaterThan(plain);
    expect(eased).toBeLessThan(best);
  }, 60_000);

  it("plays the small and the big courts too", () => {
    for (const variant of ["small", "big"]) {
      const round = robotRound(startRound({ variant, seed: `${variant}Bot`.padEnd(8, "x").slice(0, 8) }), { skill: 1, random: seeded(2) });
      expect(round.over).not.toBeNull();
    }
  });

  it("plays a whole round between two phones against itself, ending legally", () => {
    const players = [0, 1].map((side) => () => encodeReport(robotRound(startRound({ seed: "BothBots" }), { skill: side ? 0.5 : 1, random: seeded(side + 1) })));
    const { moves, result: ended } = playOut({ initial, play, result, turn }, players);
    expect(moves).toHaveLength(2);
    expect([0, 1, null]).toContain(ended.winner);
  });
});
