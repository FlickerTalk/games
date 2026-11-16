// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomOf } from "../../../kit/src/canvas/random.js";
import { exchange } from "../src/bout.js";
import { flickMove, habitOf } from "../src/robot.js";

const play = (seed, skill, mine, count = 400) => {
  const flick = [];
  const player = [];
  const hits = [0, 0];
  for (let index = 0; index < count; index += 1) {
    const theirs = flickMove({ seed, index, theirs: player, skill, gap: 0 });
    const own = mine({ index, flick, player });
    const { landed } = exchange(own, theirs);
    hits[0] += landed[0];
    hits[1] += landed[1];
    player.push(own);
    flick.push(theirs);
  }
  return { hits, flick };
};

const answerTo = { g: "s", b: "g", s: "b", n: "g" };

describe("Flick's moves", () => {
  it("are the same for the same round and exchange, and never depend on the move the player is choosing now", () => {
    const one = flickMove({ seed: "seedAAAA", index: 4, theirs: ["g", "g", "b", "s"], skill: 0.5, gap: 0 });
    const two = flickMove({ seed: "seedAAAA", index: 4, theirs: ["g", "g", "b", "s"], skill: 0.5, gap: 0 });
    expect(one).toBe(two);
    expect(["g", "b", "s", "n"]).toContain(one);
  });

  it("follow a short habit of its own, with more than one move in it", () => {
    for (const seed of ["seedAAAA", "seedBBBB", "seedCCCC", "seedDDDD"]) {
      const habit = habitOf(seed);
      expect(habit).toHaveLength(4);
      expect(new Set(habit).size, seed).toBeGreaterThan(1);
      expect(habit.every((move) => "gbs".includes(move))).toBe(true);
    }
  });

  it("lose clearly to a player who has learned the habit, at the first levels", () => {
    const seed = "seedAAAA";
    const habit = habitOf(seed);
    const { hits } = play(seed, 0.3, ({ index }) => answerTo[habit[index % habit.length]]);
    expect(hits[0]).toBeGreaterThan(hits[1] * 2);
  });

  it("are about even against a player who taps anything, and harder as the skill grows", () => {
    const anything = () => {
      const random = randomOf("a player tapping");
      return () => "gbs"[Math.floor(random() * 3)];
    };
    const easy = play("seedBBBB", 0.3, anything());
    const hard = play("seedBBBB", 0.84, anything());
    expect(easy.hits[0]).toBeGreaterThan(easy.hits[1]);
    expect(hard.hits[1] - hard.hits[0]).toBeGreaterThan(easy.hits[1] - easy.hits[0]);
  });

  it("read a player who always does the same, more often the higher the skill", () => {
    const always = play("seedCCCC", 0.84, () => "g");
    const shields = always.flick.filter((move) => move === "s").length;
    expect(shields).toBeGreaterThan(always.flick.length * 0.4);
  });

  it("doze now and then at the first levels, hardly ever at the last, and ease off when Flick is ahead", () => {
    const dozes = (skill, gap) => {
      let count = 0;
      for (let index = 0; index < 400; index += 1) if (flickMove({ seed: "seedDDDD", index, theirs: [], skill, gap }) === "n") count += 1;
      return count;
    };
    expect(dozes(0.3, 0)).toBeGreaterThan(40);
    expect(dozes(0.84, 0)).toBeLessThan(dozes(0.3, 0) / 2);
    expect(dozes(0.5, 4)).toBeGreaterThan(dozes(0.5, 0));
  });
});
