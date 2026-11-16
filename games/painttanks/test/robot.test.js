import { describe, expect, it } from "vitest";
import { randomOf } from "../../../kit/src/canvas/random.js";
import { missOf, robotShot } from "../src/robot.js";
import { battle, readShot, setupMove } from "../src/rules.js";
import { FIELDS } from "../src/world.js";

const begin = (field, wind = 0, seed = "AbCdEfGh") => battle.play(battle.initial(), setupMove({ field, wind, seed }), 0).state;

function playRound(field, skills, seed) {
  let state = begin(field, 5, seed);
  let guard = 0;
  while (!battle.result(state) && guard < 40) {
    const side = battle.turn(state);
    const move = robotShot(state, side, { skill: skills[side], random: randomOf(`${seed}/${state.shots}`) });
    const played = battle.play(state, move, side);
    expect(played.error, move).toBeUndefined();
    state = played.state;
    guard += 1;
  }
  return state;
}

describe("Flick's aim", () => {
  it("is always a shot the rules accept, on every battlefield, and a whole round ends", () => {
    for (const field of FIELDS) {
      const state = playRound(field, [0.5, 0.8], `${field}Seed1`.slice(0, 8));
      expect(battle.result(state), field).not.toBeNull();
    }
  }, 60_000);

  it("finds the rival when it aims its best, and misses by more when it is told to be less sure", () => {
    const state = begin("land");
    const sure = missOf(state, 1, readShot(robotShot(state, 1, { skill: 1, random: randomOf("x") })));
    expect(sure).toBe(0);
    let unsure = 0;
    for (let at = 0; at < 12; at += 1) unsure += missOf(state, 1, readShot(robotShot(state, 1, { skill: 0.2, random: randomOf(`try${at}`) })));
    expect(unsure / 12).toBeGreaterThan(10);
  });

  it("gets closer shot after shot, like a person correcting their aim", () => {
    const state = begin("land");
    const average = (tries) => {
      let sum = 0;
      for (let at = 0; at < 16; at += 1) sum += missOf(state, 1, readShot(robotShot(state, 1, { skill: 0.4, tries, random: randomOf(`again${at}`) })));
      return sum / 16;
    };
    expect(average(3)).toBeLessThan(average(0));
  });

  it("dives and fires paint torpedoes as a submarine in the deep sea", () => {
    let state = begin("deep");
    state = battle.play(state, "f0500", 0).state;
    const move = robotShot(state, 1, { skill: 0.9, random: randomOf("sub") });
    expect(move.startsWith("t")).toBe(true);
  });
});
