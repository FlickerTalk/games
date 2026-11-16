import { describe, expect, it } from "vitest";
import { MOST_SHOTS, PRACTICE_SHOTS, battle, encodeShot, practice, readShot, setupMove, windOf, worldOf } from "../src/rules.js";
import { flyShot } from "../src/physics.js";
import { vehicleAt } from "../src/world.js";

const SEED = "AbCdEfGh";

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function run(rules, moves) {
  let state = rules.initial();
  for (const move of moves) {
    const played = rules.play(state, move, rules.turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    state = played.state;
  }
  return state;
}

function hitting(state, side, other) {
  const world = worldOf(state);
  for (let power = 5; power <= 99; power += 1) {
    const shot = { kind: "ball", angle: 45, power };
    if (flyShot(world, side, shot, { wind: windOf(state), targets: state.targets }).painted.includes(other)) return encodeShot(shot);
  }
  throw new Error("no hit");
}

const missing = () => encodeShot({ kind: "ball", angle: 5, power: 0 });

describe("a round's moves", () => {
  it("are short strings: the battlefield, the wind and the seed first, then each shot's angle and power", () => {
    expect(setupMove({ field: "coast", wind: 3, seed: SEED })).toBe("s23AbCdEfGh");
    expect(encodeShot({ kind: "ball", angle: 45, power: 72 })).toBe("f4572");
    expect(encodeShot({ kind: "torpedo", angle: -10, power: 7 })).toBe("t3507");
    expect(readShot("f4572")).toEqual({ kind: "ball", angle: 45, power: 72 });
    expect(readShot("t3507")).toEqual({ kind: "torpedo", angle: -10, power: 7 });
    for (const bad of ["f9072", "f0472", "f45", "f45720", "x4572", "t9507", 7, null]) expect(readShot(bad), String(bad)).toBeNull();
  });

  it("start with the setup by the side that starts, then alternate, and refuse anything out of turn or malformed", () => {
    const start = battle.initial();
    expect(battle.turn(start)).toBe(0);
    expect(battle.play(start, "f4572", 0).error).toBeTruthy();
    expect(battle.play(start, "s93AbCdEfGh", 0).error).toBeTruthy();
    expect(battle.play(start, "p03AbCdEfGh", 0).error).toBeTruthy();
    const set = run(battle, ["s03AbCdEfGh"]);
    expect(set.setup).toEqual({ field: "land", wind: 3, seed: SEED, practice: false });
    expect(set.targets).toHaveLength(4);
    expect(battle.turn(set)).toBe(0);
    expect(battle.play(set, "f4572", 1).error).toBe("turn");
    expect(battle.play(set, "t4572", 0).error).toBeTruthy();
    const one = run(battle, ["s03AbCdEfGh", "f4572"]);
    expect(battle.turn(one)).toBe(1);
    expect(one.last.side).toBe(0);
    expect(one.last.flight.path.length).toBeGreaterThan(5);
  });

  it("never change the state they are played on, and replay to the same state every time", () => {
    const moves = ["s13AbCdEfGh", "f4060", "f5070", "f3555", "f6080"];
    const before = deepFreeze(run(battle, moves.slice(0, 3)));
    expect(() => battle.play(before, moves[3], battle.turn(before))).not.toThrow();
    expect(JSON.stringify(run(battle, moves))).toBe(JSON.stringify(run(battle, JSON.parse(JSON.stringify(moves)))));
  });

  it("let a submarine dive to fire a torpedo, and only a submarine", () => {
    const deep = run(battle, ["s30AbCdEfGh", "f4550"]);
    expect(battle.play(deep, "t5099", 1).state.under).toEqual([false, true]);
    expect(battle.play(deep, "f5099", 1).state.under).toEqual([false, false]);
    expect(battle.play(run(battle, ["s30AbCdEfGh"]), "t5099", 0).error).toBeTruthy();
  });
});

describe("a battle", () => {
  it("is won by the side that paints the other three times, a star for each", () => {
    let state = run(battle, ["s00AbCdEfGh"]);
    expect(windOf(state)).toBe(0);
    for (let round = 0; round < 3; round += 1) {
      state = battle.play(state, hitting(state, 0, 1), 0).state;
      if (battle.result(state)) break;
      state = battle.play(state, missing(state, 1), 1).state;
    }
    expect(state.paint).toEqual([0, 3]);
    expect(state.score[0]).toBeGreaterThanOrEqual(3);
    expect(battle.result(state)).toMatchObject({ winner: 0 });
    expect(battle.play(state, "f4560", 1).error).toBe("over");
  });

  it("ends after the last shot with the less painted side ahead, or even", () => {
    let state = run(battle, ["s00AbCdEfGh"]);
    for (let shot = 0; shot < MOST_SHOTS * 2 && !battle.result(state); shot += 1) state = battle.play(state, missing(state, battle.turn(state)), battle.turn(state)).state;
    expect(state.shots).toBe(MOST_SHOTS * 2);
    expect(battle.result(state).winner).toBe(state.paint[0] === state.paint[1] ? (state.score[0] === state.score[1] ? null : state.score[0] > state.score[1] ? 0 : 1) : state.paint[0] < state.paint[1] ? 0 : 1);
  });

  it("gives the special paint ball to whoever paints the gift crate, and the rain washes a level off the vehicle under it", () => {
    let state = run(battle, ["s00AbCdEfGh"]);
    const crate = { kind: "giftCrate", x: 200, y: 120, size: 56, hit: false };
    state = { ...state, targets: [crate] };
    const world = worldOf(state);
    let move = null;
    for (let angle = 30; angle <= 80 && !move; angle += 1) {
      for (let power = 20; power <= 99 && !move; power += 1) {
        if (flyShot(world, 0, { kind: "ball", angle, power }, { targets: [crate] }).struck.includes(0)) move = encodeShot({ kind: "ball", angle, power });
      }
    }
    const after = battle.play(state, move, 0).state;
    expect(after.special).toEqual([true, false]);
    expect(after.targets[0].hit).toBe(true);
    expect(after.score[0]).toBe(1);
    const tank = vehicleAt(world, 1);
    const cloud = { kind: "rainCloud", x: tank.x, y: 80, size: 56, hit: false };
    const wet = battle.play({ ...after, paint: [0, 2], targets: [cloud] }, "f8599", 1);
    const struck = flyShot(worldOf(after), 1, readShot("f8599"), { targets: [cloud] }).struck.includes(0);
    if (struck) expect(wet.state.paint[1]).toBeLessThan(2);
  });
});

describe("target practice", () => {
  it("is ten shots of one vehicle at the field's targets, a star for each one painted", () => {
    expect(PRACTICE_SHOTS).toBe(10);
    const start = run(practice, ["p20AbCdEfGh"]);
    expect(start.setup.practice).toBe(true);
    expect(start.targets).toHaveLength(7);
    let state = start;
    while (!practice.result(state)) state = practice.play(state, "f4550", 0).state;
    expect(state.shots).toBeLessThanOrEqual(PRACTICE_SHOTS);
    expect(practice.result(state)).toMatchObject({ winner: 0, score: state.targets.filter((one) => one.hit).length });
    expect(practice.turn(start)).toBe(0);
  });
});
