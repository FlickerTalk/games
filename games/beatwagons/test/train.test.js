import { describe, expect, it } from "vitest";
import { BEATS, KINDS, MOST, answersOf, beatsOf, checkTrain, decodeTrain, encodeTrain, gapsOf, kindOf, makeTrain, periodOf, wagonOf } from "../src/train.js";

const [A, B, C] = [wagonOf(0, 1), wagonOf(1, 1), wagonOf(2, 1)];

describe("a wagon", () => {
  it("is one of eight instruments carrying one, two or three beats", () => {
    expect([KINDS, BEATS]).toEqual([8, 3]);
    const all = Array.from({ length: KINDS * BEATS }, (_, id) => id);
    expect(new Set(all.map((id) => `${kindOf(id)}/${beatsOf(id)}`)).size).toBe(24);
    expect([kindOf(wagonOf(5, 3)), beatsOf(wagonOf(5, 3))]).toEqual([5, 3]);
  });
});

describe("a pattern", () => {
  it("is a unit repeated at least twice, the last repeat may be cut short", () => {
    expect(periodOf([A, B, A, B])).toBe(2);
    expect(periodOf([A, A, B, A, A, B, A])).toBe(3);
    expect(periodOf([A, A, A, A])).toBe(1);
    expect(periodOf([A, B, C, A, B])).toBeNull();
    expect(periodOf([A, B, A, A])).toBeNull();
    expect(periodOf([A, B, C])).toBeNull();
  });

  it("tells wagons of the same instrument apart by their beats", () => {
    expect(periodOf([A, wagonOf(0, 2), A, wagonOf(0, 2)])).toBe(2);
    expect(periodOf([A, wagonOf(0, 2), A, A])).toBeNull();
  });
});

describe("a train with gaps", () => {
  it("travels as one short word and comes back the same", () => {
    const train = makeTrain([A, B, A, B, A, B], [3, 5]);
    const code = encodeTrain(train);
    expect(code).toBe("TadaDaD");
    expect(decodeTrain(code)).toEqual(train);
    expect(gapsOf(train)).toEqual([3, 5]);
    expect(Object.isFrozen(train)).toBe(true);
  });

  it("is refused when the word is not a train", () => {
    for (const bad of [null, 7, "", "T", "Tada", "Xadad", "Tadaz", "Tad d", `T${"a".repeat(MOST + 1)}`, "TADAD"]) expect(decodeTrain(bad), String(bad)).toBeNull();
    expect(decodeTrain("TadaD")).not.toBeNull();
  });

  it("lists every way of filling the gaps that makes a pattern", () => {
    expect(answersOf(makeTrain([A, B, A, B], [3]))).toEqual([[B]]);
    expect(answersOf(makeTrain([A, B, A, B], [2, 3]))).toEqual([[A, B]]);
    expect(answersOf(makeTrain([A, B, C, A, B, C], [2, 5]))).toHaveLength(24);
  });

  it("is fit to send only with four to seven wagons, one or two gaps, a pattern, and exactly one right answer", () => {
    expect(checkTrain(makeTrain([A, B, A, B], [3]))).toBeNull();
    expect(checkTrain(makeTrain([A, A, B, A, A, B, A], [0, 4]))).toBeNull();
    expect(checkTrain(makeTrain([A, B, A], [2]))).toBe("length");
    expect(checkTrain(makeTrain([A, B, A, B], []))).toBe("gaps");
    expect(checkTrain(makeTrain([A, B, A, B, A, B], [0, 2, 4]))).toBe("gaps");
    expect(checkTrain(makeTrain([A, B, C, A], [3]))).toBe("pattern");
    expect(checkTrain(makeTrain([A, B, C, A, B, C], [2, 5]))).toBe("answers");
    expect(checkTrain(null)).toBe("length");
  });
});
