import { describe, expect, it } from "vitest";
import * as kit from "../../src/progress/index.js";
import { defineProgress } from "../../src/progress/index.js";

function memoryStore() {
  const kept = new Map();
  return {
    kept,
    get: async (key) => kept.get(key) ?? null,
    set: async (key, value) => {
      kept.set(key, value);
      return true;
    },
    forget: async (key) => kept.delete(key),
  };
}

const balloons = defineProgress({
  timed: true,
  curve: { balloons: { first: 3, step: 1, limit: 8 }, drift: { first: 1, step: 0.1, limit: 1.4, eased: -0.3 } },
  stars: { two: 20, three: 35 },
  gifts: { looks: ["red", "blue", "kite", "comet", "moon"], free: 2, every: [2] },
});

describe("declaring a game's progress", () => {
  it("turns nothing on that the game does not declare: no curve, no length of round, no stars, no gifts", () => {
    const bare = defineProgress({});
    expect(bare.spec).toEqual({ curve: {}, timed: false, stars: null, gifts: null });
    expect(bare.plateau).toBe(1);
    expect(bare.schedule).toEqual([]);
    expect(bare.nextRound(bare.fresh())).toEqual({ level: 1, eased: false, values: {} });
    const outcome = bare.awardRound(bare.fresh(), { won: true });
    expect([outcome.stars, outcome.gift, bare.owned(outcome.record)]).toEqual([null, null, []]);
    expect(defineProgress({ stars: null, gifts: null }).spec).toEqual(bare.spec);
  });

  it("gives a game that declares everything its rounds, stars and gifts from a few lines of data", () => {
    expect(balloons.plateau).toBe(6);
    expect(balloons.schedule).toEqual([{ look: "kite", at: 2 }, { look: "comet", at: 4 }, { look: "moon", at: 6 }]);
    let record = balloons.fresh();
    expect(balloons.nextRound(record)).toEqual({ level: 1, eased: false, values: { balloons: 3, drift: 1 }, seconds: 35, halfway: false });
    expect(balloons.owned(record)).toEqual(["red", "blue"]);
    record = balloons.awardRound(record, { won: true, score: 21 }).record;
    const second = balloons.awardRound(record, { won: true, score: 36 });
    expect(second).toMatchObject({ levelUp: true, gift: "kite", stars: 3, newBest: true });
    expect(balloons.owned(second.record)).toEqual(["red", "blue", "kite"]);
    expect(balloons.nextRound(second.record)).toMatchObject({ level: 3, seconds: 45 });
  });

  it("lets the player choose only a look they own", () => {
    const record = balloons.fresh();
    expect(balloons.choose(record, "blue").chosen).toBe("blue");
    expect(balloons.choose(record, "moon").chosen).toBe("red");
    expect(balloons.choose(record, "nothing").chosen).toBe("red");
    expect(record.chosen).toBe("red");
    const bare = defineProgress({});
    expect(bare.choose(bare.fresh(), "red").chosen).toBeNull();
  });

  it("keeps the progress in the game's own store, under the progress key, and reads it back safe", async () => {
    const store = memoryStore();
    expect(await balloons.load(store)).toEqual(balloons.fresh());
    const { record } = balloons.awardRound(balloons.fresh(), { won: true, score: 5 });
    expect(await balloons.save(store, record)).toBe(true);
    expect([...store.kept.keys()]).toEqual(["progress"]);
    expect(await balloons.load(store)).toEqual(record);
    expect(await balloons.save(store, { v: 1, level: -2, chosen: "moon" })).toBe(true);
    expect(JSON.parse(store.kept.get("progress"))).toEqual(balloons.fresh());
    expect(balloons.read("{broken")).toEqual(balloons.fresh());
  });

  it("is checked when the game is defined, and each mistake says what is wrong", () => {
    const broken = [
      [null, "declared"],
      [[], "declared"],
      [{ gift: { looks: ["a"], free: 1 } }, '"gift"'],
      [{ timed: "yes" }, "timed"],
      [{ curve: { speed: { first: 1 } } }, "speed"],
      [{ stars: { two: 3, three: 1 } }, "higher score"],
      [{ gifts: { looks: ["a", "b"], free: 1, every: [1] } }, "every 2 to 4 wins"],
    ];
    for (const [declared, message] of broken) expect(() => defineProgress(declared), JSON.stringify(declared)).toThrow(message);
  });

  it("keeps its own frozen copy of the declaration", () => {
    const declared = { timed: true, curve: { speed: { first: 1, step: 1, limit: 3 } } };
    const progress = defineProgress(declared);
    declared.timed = false;
    declared.curve.speed.first = 50;
    expect(progress.nextRound(progress.fresh())).toMatchObject({ seconds: 35, values: { speed: 1 } });
    expect(Object.isFrozen(progress) && Object.isFrozen(progress.spec) && Object.isFrozen(progress.schedule)).toBe(true);
  });

  it("also hands out the rules on their own, for a game that needs only one of them", () => {
    expect(kit.roundSeconds(13, 0)).toBe(60);
    expect(kit.starsFor(40, { two: 20, three: 35 })).toBe(3);
    expect([kit.LONGEST_ROUND_SECONDS, kit.HALFWAY_FROM_SECONDS, kit.EASE_AFTER_LOSSES, kit.PASS_AFTER_LOSSES]).toEqual([90, 60, 2, 3]);
    expect([kit.PROGRESS_KEY, kit.RECORD_VERSION, kit.GIFT_EVERY]).toEqual(["progress", 1, [2, 3, 4]]);
    expect(kit.rivalPace(24, { even: 4, full: 24 })).toBe(0.8);
    expect(typeof kit.hasHalfway).toBe("function");
  });
});
