import { describe, expect, it } from "vitest";
import { EACH, MOST, goalsOf, overOf, pointsOf, shooterOf, tallyOf } from "../src/shootout.js";

const kicks = (text) => [...text].map((mark) => ({ outcome: mark === "g" ? "goal" : mark === "s" ? "saved" : "wide", bonus: mark === "G" ? "tyre" : null })).map((kick, at) => ([..."gG"].includes(text[at]) ? { ...kick, outcome: "goal" } : kick));

describe("a shoot-out", () => {
  it("has the two sides shoot in turn, the side that starts first", () => {
    expect([0, 1, 2, 3, 9, 10].map(shooterOf)).toEqual([0, 1, 0, 1, 1, 0]);
    expect(EACH).toBe(5);
  });

  it("counts each side's goals", () => {
    const played = kicks("ggswgg");
    expect(goalsOf(played, 0)).toBe(2);
    expect(goalsOf(played, 1)).toBe(2);
  });

  it("goes on while either side can still win, and ends as soon as one cannot be caught", () => {
    expect(overOf(kicks(""))).toBeNull();
    expect(overOf(kicks("gsgsg"))).toBeNull();
    expect(overOf(kicks("gsgsgs"))).toEqual({ winner: 0 });
    expect(overOf(kicks("sgsgs"))).toBeNull();
    expect(overOf(kicks("sgsgsg"))).toEqual({ winner: 1 });
    expect(overOf(kicks("gggggggggs"))).toEqual({ winner: 0 });
  });

  it("goes to sudden death after five each all square: a pair at a time until one side is ahead", () => {
    const level = "gggggggggg";
    expect(overOf(kicks(level))).toBeNull();
    expect(overOf(kicks(`${level}g`))).toBeNull();
    expect(overOf(kicks(`${level}gg`))).toBeNull();
    expect(overOf(kicks(`${level}ggs`))).toBeNull();
    expect(overOf(kicks(`${level}ggsg`))).toEqual({ winner: 1 });
    expect(overOf(kicks(`${level}gs`))).toEqual({ winner: 0 });
  });

  it("ends all square after five pairs of sudden death, so a match never grows without end", () => {
    const level = "ss".repeat(MOST / 2);
    expect(MOST).toBe(20);
    expect(overOf(kicks(level.slice(0, -2)))).toBeNull();
    expect(overOf(kicks(level))).toEqual({ winner: null });
  });

  it("shows each side five circles: a goal, a miss, or still to come, and a fresh row for sudden death", () => {
    const played = kicks("gswg");
    expect(tallyOf(played, 0)).toEqual(["goal", "miss", null, null, null]);
    expect(tallyOf(played, 1)).toEqual(["miss", "goal", null, null, null]);
    const sudden = kicks("ggggggggggg");
    expect(tallyOf(sudden, 0)).toEqual(["goal", null, null, null, null]);
    expect(tallyOf(sudden, 1)).toEqual(["goal", "goal", "goal", "goal", "goal"]);
    expect(tallyOf(kicks("gggggggggggs"), 1)).toEqual(["miss", null, null, null, null]);
  });

  it("scores a side one point a goal, one a save and one a bonus target", () => {
    const played = kicks("Ggsswg");
    expect(pointsOf(played, 0)).toBe(2 + 1);
    expect(pointsOf(played, 1)).toBe(2 + 1);
    expect(pointsOf(kicks("wwww"), 0)).toBe(0);
  });
});
