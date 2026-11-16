import { describe, expect, it } from "vitest";
import { addWagon, blankBuild, checkBuilt, cycleBeats, toggleGap, trainOf, undoWagon } from "../src/composer.js";
import { MOST, encodeTrain, wagonOf } from "../src/train.js";

const built = (kinds) => kinds.reduce((build, kind) => addWagon(build, kind), blankBuild());

describe("composing a train", () => {
  it("starts empty, adds the wagon touched at the end, and takes the last one off", () => {
    expect(blankBuild()).toMatchObject({ wagons: [], hidden: [], beats: 1 });
    const build = built([0, 1, 0]);
    expect(build.wagons).toEqual([wagonOf(0), wagonOf(1), wagonOf(0)]);
    expect(undoWagon(build).wagons).toEqual([wagonOf(0), wagonOf(1)]);
    expect(undoWagon(blankBuild())).toEqual(blankBuild());
  });

  it("holds seven wagons and no more", () => {
    const full = built(Array(MOST + 3).fill(2));
    expect(full.wagons).toHaveLength(MOST);
  });

  it("gives the next wagons one, two or three beats, round and round", () => {
    let build = cycleBeats(blankBuild());
    expect(build.beats).toBe(2);
    build = addWagon(build, 4);
    expect(build.wagons).toEqual([wagonOf(4, 2)]);
    expect(cycleBeats(cycleBeats(build)).beats).toBe(1);
  });

  it("hides a wagon when it is touched and brings it back when touched again, and forgets the gap of a wagon taken off", () => {
    let build = toggleGap(built([0, 1, 0, 1]), 3);
    expect(build.hidden).toEqual([false, false, false, true]);
    expect(encodeTrain(trainOf(build))).toBe("TadaD");
    expect(toggleGap(build, 3).hidden[3]).toBe(false);
    expect(toggleGap(build, 9)).toEqual(build);
    build = undoWagon(build);
    expect(build.hidden).toEqual([false, false, false]);
  });

  it("says whether the train can be sent: a pattern with one or two gaps and one right answer", () => {
    expect(checkBuilt(blankBuild())).toEqual({ ok: false, why: "length" });
    expect(checkBuilt(built([0, 1, 0, 1]))).toEqual({ ok: false, why: "gaps" });
    expect(checkBuilt(toggleGap(built([0, 1, 2, 1]), 3))).toEqual({ ok: false, why: "pattern" });
    expect(checkBuilt(toggleGap(built([0, 1, 0, 1]), 3))).toEqual({ ok: true, why: null });
  });
});
